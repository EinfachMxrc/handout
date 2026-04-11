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

// No debounce: call immediately so getSelectedDataAsync still has focus on slide
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

  // Taskpane lost focus → user moved to presentation.
  // Wait briefly for focus transfer to complete, then try reading.
  windowBlurListener = () => setTimeout(() => void syncCurrentSlide(), 80);

  // Taskpane gained focus → user just came from the slides.
  // Read immediately before focus fully transfers to taskpane.
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
 * Get current slide info using two strategies:
 *
 * 1. PowerPoint JS API + getSelectedSlides() (PowerPointApi 1.5)
 *    Focus-independent — works regardless of where keyboard focus is.
 *
 * 2. Legacy getSelectedDataAsync(SlideRange)
 *    Only works when focus is on the presentation (not the taskpane).
 *    Called immediately on selection-change events so it often succeeds.
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

    if (isPowerPointApiAvailable()) {
      (globalThis as any).PowerPoint.run(async (context: any) => {
        try {
          const allSlides = context.presentation.slides;
          allSlides.load("items/id");

          let selectedSlides: any = null;
          try {
            selectedSlides = context.presentation.getSelectedSlides();
            selectedSlides.load("items/id");
          } catch {
            // getSelectedSlides requires PowerPointApi 1.5
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

          // PowerPoint.run worked but getSelectedSlides not available — fall back
          legacyGetSlideInfo(presentationTitle, totalSlides, resolve);
        } catch {
          legacyGetSlideInfo(presentationTitle, 0, resolve);
        }
      }).catch(() => legacyGetSlideInfo(presentationTitle, 0, resolve));
      return;
    }

    legacyGetSlideInfo(presentationTitle, 0, resolve);
  });
}

function legacyGetSlideInfo(
  presentationTitle: string,
  knownTotalSlides: number,
  resolve: (value: OfficeSlideInfo | null) => void
): void {
  try {
    Office.context.document.getSelectedDataAsync(
      Office.CoercionType.SlideRange,
      (slideResult: {
        status: string;
        value?: { slides?: Array<{ index: number }> };
      }) => {
        if (slideResult.status === Office.AsyncResultStatus.Failed) {
          resolve(null);
          return;
        }

        const slides = slideResult.value?.slides;
        if (!slides || slides.length === 0) {
          resolve(null);
          return;
        }

        const slideNumber = slides[0].index + 1;

        if (knownTotalSlides > 0) {
          resolve({ slideNumber, totalSlides: knownTotalSlides, presentationTitle });
          return;
        }

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
    );
  } catch {
    resolve(null);
  }
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
