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

// No debounce — call immediately while slide is still the active selection
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
    // ignore transient errors
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
 * Get current slide info.
 *
 * Current slide  → getSelectedDataAsync(SlideRange)
 *   index is 1-based in Office.js — use it directly (no +1).
 *   Works in Online always; works in Desktop when slide has focus.
 *   Desktop fallback: PowerPoint.run + getSelectedSlides (focus-independent).
 *
 * Total slides → PowerPoint.run().slides.items.length (reliable everywhere).
 *   Fallback: getSlideCountAsync.
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

    try {
      Office.context.document.getSelectedDataAsync(
        Office.CoercionType.SlideRange,
        (slideResult: {
          status: string;
          value?: { slides?: Array<{ index: number }> };
        }) => {
          const slides = slideResult.value?.slides;

          if (
            slideResult.status === Office.AsyncResultStatus.Failed ||
            !slides ||
            slides.length === 0
          ) {
            // getSelectedDataAsync failed (Desktop taskpane-focus issue).
            // Try PowerPoint.run as Desktop-only fallback.
            if (!isOnline() && isPowerPointApiAvailable()) {
              powerPointRunGetSlide(presentationTitle, resolve);
            } else {
              resolve(null);
            }
            return;
          }

          // index is 1-based in Office.js — use directly, no +1
          const slideNumber = slides[0].index;

          fetchTotalSlides(presentationTitle, slideNumber, resolve);
        }
      );
    } catch {
      resolve(null);
    }
  });
}

/**
 * Fetch total slide count.
 * Prefers PowerPoint.run (works in Online + Desktop, no focus dependency).
 * Falls back to getSlideCountAsync for environments without the JS API.
 */
function fetchTotalSlides(
  presentationTitle: string,
  slideNumber: number,
  resolve: (v: OfficeSlideInfo | null) => void
): void {
  if (isPowerPointApiAvailable()) {
    (globalThis as any).PowerPoint.run(async (context: any) => {
      try {
        context.presentation.slides.load("items/id");
        await context.sync();
        const totalSlides: number = context.presentation.slides.items.length;
        resolve({ slideNumber, totalSlides, presentationTitle });
      } catch {
        legacySlideCount(presentationTitle, slideNumber, resolve);
      }
    }).catch(() => legacySlideCount(presentationTitle, slideNumber, resolve));
    return;
  }
  legacySlideCount(presentationTitle, slideNumber, resolve);
}

function legacySlideCount(
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

/** Desktop-only fallback via PowerPoint JS API. */
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
