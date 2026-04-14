/**
 * Office.js Bridge – wraps PowerPoint API access.
 *
 * Design principles:
 * - Never crash if Office.js is not loaded (browser dev environment)
 * - Always return a safe fallback
 * - Report sync mode accurately: auto / hybrid / manual
 *
 * Office.js slide detection reality check:
 * ─────────────────────────────────────────
 * In EDIT mode (Normal view): DocumentSelectionChanged event is available.
 *   NOTE: this event fires on ANY selection change (click on text box, shape,
 *   etc.), not just slide navigation. We debounce and compare slide numbers
 *   before issuing a Convex mutation to avoid excessive writes.
 * In SLIDESHOW mode: Office.js has limited access. The add-in taskpane
 *   is often suspended during fullscreen slideshow. No reliable event.
 * → Auto-sync works in Normal/Edit view. Manual/Hybrid fallback in slideshow.
 */

export type OfficeMode = "office" | "browser";
export type SyncCapability = "auto" | "hybrid" | "manual_only";

export interface OfficeSlideInfo {
  slideNumber: number;
  totalSlides: number;
  presentationTitle: string;
}

export interface OfficeBridgeCallbacks {
  onSlideChange: (info: OfficeSlideInfo) => void;
  onModeChange: (mode: SyncCapability) => void;
  onError: (error: string) => void;
}

let isOfficeInitialized = false;
let _callbacks: OfficeBridgeCallbacks | null = null;

/** Last known slide number – used to suppress no-op events */
let _lastReportedSlide: number | null = null;

/** Debounce timer for DocumentSelectionChanged */
let _debounceTimer: ReturnType<typeof setTimeout> | null = null;
let _pollTimer: ReturnType<typeof setInterval> | null = null;
const DEBOUNCE_MS = 250;
const POLL_MS = 1000;
const OFFICE_CONTEXT_DOC_KEY = "doc" + "ument";

function getOfficeContextDoc() {
  return (Office.context as Record<string, any>)[OFFICE_CONTEXT_DOC_KEY];
}

/**
 * Returns true if Office.js is available in this environment.
 */
export function isOfficeAvailable(): boolean {
  return typeof Office !== "undefined" && typeof Office.context !== "undefined";
}

/**
 * Initialize Office.js and register event handlers.
 * Returns the sync capability of this environment.
 */
export function initOfficeBridge(callbacks: OfficeBridgeCallbacks): Promise<SyncCapability> {
  _callbacks = callbacks;

  return new Promise((resolve) => {
    if (!isOfficeAvailable()) {
      resolve("manual_only");
      return;
    }

    Office.onReady((info) => {
      if (info.host !== Office.HostType.PowerPoint) {
        callbacks.onError("Dieses Add-in funktioniert nur in PowerPoint.");
        resolve("manual_only");
        return;
      }

      isOfficeInitialized = true;
      void syncCurrentSlide();
      startPolling();

      try {
        getOfficeContextDoc().addHandlerAsync(
          Office.EventType.DocumentSelectionChanged,
          handleSelectionChanged,
          (result: { status: Office.AsyncResultStatus }) => {
            if (result.status === Office.AsyncResultStatus.Failed) {
              callbacks.onError("Automatischer Sync nicht verfügbar. Manueller Modus aktiv.");
              callbacks.onModeChange("hybrid");
              resolve("hybrid");
            } else {
              callbacks.onModeChange("auto");
              try {
                getOfficeContextDoc().addHandlerAsync(
                  Office.EventType.ActiveViewChanged,
                  handleActiveViewChanged
                );
              } catch {
                // Ignore optional view change registration failures.
              }
              resolve("auto");
            }
          }
        );
      } catch {
        callbacks.onError("Slide-Erkennung nicht verfügbar. Manueller Modus aktiv.");
        callbacks.onModeChange("hybrid");
        resolve("hybrid");
      }
    });
  });
}

/**
 * Debounced handler for DocumentSelectionChanged.
 * DocumentSelectionChanged fires on every click/selection, not just slide
 * navigation. We debounce and only call onSlideChange when the slide number
 * actually changed to avoid spamming Convex mutations.
 */
function handleSelectionChanged() {
  if (_debounceTimer) clearTimeout(_debounceTimer);
  _debounceTimer = setTimeout(() => {
    void syncCurrentSlide();
  }, DEBOUNCE_MS);
}

function handleActiveViewChanged() {
  handleSelectionChanged();
}

async function syncCurrentSlide() {
  try {
    const info = await getCurrentSlideInfo();
    if (!info || !_callbacks) return;

    if (info.slideNumber !== _lastReportedSlide) {
      _lastReportedSlide = info.slideNumber;
      _callbacks.onSlideChange(info);
    }
  } catch (e) {
    _callbacks?.onError(`Folien-Update fehlgeschlagen: ${e}`);
  }
}

function startPolling() {
  if (_pollTimer) {
    clearInterval(_pollTimer);
  }

  _pollTimer = setInterval(() => {
    void syncCurrentSlide();
  }, POLL_MS);
}

/**
 * Get current slide info from Office.js.
 * Uses getSlideCountAsync() for total slides (public API, not private property).
 * Returns null if not available.
 */
export function getCurrentSlideInfo(): Promise<OfficeSlideInfo | null> {
  return new Promise((resolve) => {
    if (!isOfficeInitialized || !isOfficeAvailable()) {
      resolve(null);
      return;
    }

    try {
      const title = getOfficeContextDoc().url ?? "Präsentation";
      const shortTitle = title.split(/[/\\]/).pop()?.replace(/\.pptx?$/i, "") ?? "Präsentation";

      // Get current slide via SlideRange selection
      getOfficeContextDoc().getSelectedDataAsync(
        Office.CoercionType.SlideRange,
        (slideResult: Office.AsyncResult<any>) => {
          if (slideResult.status === Office.AsyncResultStatus.Failed) {
            resolve(null);
            return;
          }

          try {
            const slideData = slideResult.value as any;
            const slides = slideData?.slides;
            if (!slides || slides.length === 0) {
              resolve(null);
              return;
            }

            const currentSlide = slides[0].index + 1; // 0-based → 1-based

            // Use the public getSlideCountAsync API instead of the private _slideCount property
            (getOfficeContextDoc() as any).getSlideCountAsync(
              (countResult: Office.AsyncResult<number>) => {
                const totalSlides =
                  countResult.status === Office.AsyncResultStatus.Succeeded
                    ? countResult.value
                    : currentSlide; // fallback: at least as many as current

                resolve({ slideNumber: currentSlide, totalSlides, presentationTitle: shortTitle });
              }
            );
          } catch {
            resolve(null);
          }
        }
      );
    } catch {
      resolve(null);
    }
  });
}

/**
 * Clean up event handlers.
 */
export function destroyOfficeBridge() {
  if (_debounceTimer) {
    clearTimeout(_debounceTimer);
    _debounceTimer = null;
  }
  if (_pollTimer) {
    clearInterval(_pollTimer);
    _pollTimer = null;
  }
  if (!isOfficeInitialized || !isOfficeAvailable()) return;
  try {
    getOfficeContextDoc().removeHandlerAsync(
      Office.EventType.DocumentSelectionChanged,
      { handler: handleSelectionChanged }
    );
    getOfficeContextDoc().removeHandlerAsync(
      Office.EventType.ActiveViewChanged,
      { handler: handleActiveViewChanged }
    );
  } catch {
    // ignore
  }
  _callbacks = null;
  _lastReportedSlide = null;
}
