declare const Office: any;

export type SyncCapability = "auto" | "hybrid" | "manual_only";

export interface OfficeSlideInfo {
  slideNumber: number;
  totalSlides: number;
  presentationTitle: string;
}

export interface OfficeBridgeCallbacks {
  onSlideChange: (info: OfficeSlideInfo) => void;
  onModeChange: (mode: SyncCapability) => void;
  onError: (message: string) => void;
}

let isInitialized = false;
let activeCallbacks: OfficeBridgeCallbacks | null = null;
let lastReportedSlide: number | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let windowBlurListener: (() => void) | null = null;
let windowFocusListener: (() => void) | null = null;

// Poll often enough to catch slide changes in both Online and Desktop
const POLL_MS = 500;

export function isOfficeAvailable(): boolean {
  return typeof Office !== "undefined" && typeof Office.context !== "undefined";
}

function isPowerPointApiAvailable(): boolean {
  return (
    typeof (globalThis as any).PowerPoint !== "undefined" &&
    typeof (globalThis as any).PowerPoint.run === "function"
  );
}

/** True when running inside PowerPoint Online (browser-based). */
function isOnline(): boolean {
  try {
    return (
      isOfficeAvailable() &&
      Office.context.platform === Office.PlatformType.OfficeOnline
    );
  } catch {
    return false;
  }
}

export function initOfficeBridge(
  callbacks: OfficeBridgeCallbacks
): Promise<SyncCapability> {
  activeCallbacks = callbacks;

  return new Promise((resolve) => {
    if (typeof Office === "undefined") {
      resolve("manual_only");
      return;
    }

    Office.onReady((info: { host: string }) => {
      if (info.host !== Office.HostType.PowerPoint) {
        callbacks.onError("Dieses Add-in funktioniert nur in PowerPoint.");
        resolve("manual_only");
        return;
      }

      isInitialized = true;

      void syncCurrentSlide();
      startPolling();

      // Window blur/focus helps on Desktop: when the user clicks into the
      // slide panel the taskpane iframe loses focus — good moment to read.
      // (In Online everything is same-window, so these fire less usefully
      // but do no harm.)
      setupWindowListeners();

      try {
        Office.context.document.addHandlerAsync(
          Office.EventType.DocumentSelectionChanged,
          handleSelectionChanged,
          (result: { status: string }) => {
            if (result.status === Office.AsyncResultStatus.Failed) {
              callbacks.onModeChange("hybrid");
              resolve("hybrid");
              return;
            }
            callbacks.onModeChange("auto");
            try {
              Office.context.document.addHandlerAsync(
                Office.EventType.ActiveViewChanged,
                handleSelectionChanged
              );
            } catch {
              // optional
            }
            resolve("auto");
          }
        );
      } catch {
        callbacks.onModeChange("hybrid");
        resolve("hybrid");
      }
    });
  });
}

// No debounce — read immediately while the slide is still the active selection
function handleSelectionChanged() {
  void syncCurrentSlide();
}

async function syncCurrentSlide() {
  try {
    const info = await getCurrentSlideInfo();
    if (!info || !activeCallbacks) return;
    if (info.slideNumber !== lastReportedSlide) {
      lastReportedSlide = info.slideNumber;
      activeCallbacks.onSlideChange(info);
    }
  } catch {
    // silently ignore transient errors
  }
}

function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => void syncCurrentSlide(), POLL_MS);
}

function setupWindowListeners() {
  if (typeof window === "undefined") return;
  windowBlurListener = () => setTimeout(() => void syncCurrentSlide(), 80);
  windowFocusListener = () => void syncCurrentSlide();
  window.addEventListener("blur", windowBlurListener, { passive: true });
  window.addEventListener("focus", windowFocusListener, { passive: true });
}

function teardownWindowListeners() {
  if (typeof window === "undefined") return;
  if (windowBlurListener) {
    window.removeEventListener("blur", windowBlurListener);
    windowBlurListener = null;
  }
  if (windowFocusListener) {
    window.removeEventListener("focus", windowFocusListener);
    windowFocusListener = null;
  }
}

/**
 * Strategy:
 *
 * 1. getSelectedDataAsync(SlideRange) — PRIMARY for both Online and Desktop.
 *    In PowerPoint Online this always works.
 *    In Desktop it works when focus is on the slide (event handler, no debounce).
 *
 * 2. PowerPoint.run + getSelectedSlides() — FALLBACK for Desktop only.
 *    In Online, getSelectedSlides() may return wrong data (e.g. always slide 1)
 *    so we skip it when running in Online mode.
 */
export function getCurrentSlideInfo(): Promise<OfficeSlideInfo | null> {
  return new Promise((resolve) => {
    if (!isInitialized || !isOfficeAvailable()) {
      resolve(null);
      return;
    }

    const rawTitle = Office.context.document.url ?? "Praesentation";
    const presentationTitle =
      rawTitle.split(/[/\\]/).pop()?.replace(/\.pptx?$/i, "") ??
      "Praesentation";

    // ── Primary: getSelectedDataAsync ────────────────────────────────────────
    try {
      Office.context.document.getSelectedDataAsync(
        Office.CoercionType.SlideRange,
        (slideResult: {
          status: string;
          value?: { slides?: Array<{ index: number }> };
        }) => {
          if (slideResult.status !== Office.AsyncResultStatus.Failed) {
            const slides = slideResult.value?.slides;
            if (slides && slides.length > 0) {
              const slideNumber = slides[0].index + 1; // index is 0-based
              getSlideCount(presentationTitle, slideNumber, resolve);
              return;
            }
          }

          // ── Fallback: PowerPoint JS API (Desktop only) ───────────────────
          // Skip in Online because getSelectedSlides() unreliably returns
          // slide 1 there regardless of which slide is actually displayed.
          if (!isOnline() && isPowerPointApiAvailable()) {
            powerPointRunGetSlide(presentationTitle, resolve);
          } else {
            resolve(null);
          }
        }
      );
    } catch {
      resolve(null);
    }
  });
}

/** Get total slide count, then resolve. */
function getSlideCount(
  presentationTitle: string,
  slideNumber: number,
  resolve: (v: OfficeSlideInfo | null) => void
): void {
  try {
    (Office.context.document as any).getSlideCountAsync(
      (countResult: { status: string; value: number }) => {
        const totalSlides =
          countResult.status === Office.AsyncResultStatus.Succeeded
            ? countResult.value
            : slideNumber;
        resolve({ slideNumber, totalSlides, presentationTitle });
      }
    );
  } catch {
    resolve({ slideNumber, totalSlides: slideNumber, presentationTitle });
  }
}

/** Desktop fallback: PowerPoint.run + getSelectedSlides (PowerPointApi 1.5). */
function powerPointRunGetSlide(
  presentationTitle: string,
  resolve: (v: OfficeSlideInfo | null) => void
): void {
  (globalThis as any).PowerPoint.run(async (context: any) => {
    try {
      const allSlides = context.presentation.slides;
      allSlides.load("items/id");

      let selectedSlides: any = null;
      try {
        selectedSlides = context.presentation.getSelectedSlides();
        selectedSlides.load("items/id");
      } catch {
        // PowerPointApi 1.5 not available
      }

      await context.sync();

      const totalSlides: number = allSlides.items.length;

      if (selectedSlides && selectedSlides.items.length > 0) {
        const selectedId = String(selectedSlides.items[0].id);
        const allIds = allSlides.items.map((s: any) => String(s.id));
        const idx = allIds.indexOf(selectedId);
        if (idx >= 0) {
          resolve({ slideNumber: idx + 1, totalSlides, presentationTitle });
          return;
        }
      }

      resolve(null);
    } catch {
      resolve(null);
    }
  }).catch(() => resolve(null));
}

export function destroyOfficeBridge() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  teardownWindowListeners();

  if (isInitialized && isOfficeAvailable()) {
    try {
      Office.context.document.removeHandlerAsync(
        Office.EventType.DocumentSelectionChanged,
        { handler: handleSelectionChanged }
      );
      Office.context.document.removeHandlerAsync(
        Office.EventType.ActiveViewChanged,
        { handler: handleSelectionChanged }
      );
    } catch {
      // ignore
    }
  }

  isInitialized = false;
  activeCallbacks = null;
  lastReportedSlide = null;
}
