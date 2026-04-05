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
const DEBOUNCE_MS = 250;

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

      try {
        Office.context.document.addHandlerAsync(
          Office.EventType.DocumentSelectionChanged,
          handleSelectionChanged,
          (result) => {
            if (result.status === Office.AsyncResultStatus.Failed) {
              callbacks.onError("Automatischer Sync nicht verfügbar. Manueller Modus aktiv.");
              resolve("hybrid");
            } else {
              resolve("auto");
            }
          }
        );
      } catch {
        callbacks.onError("Slide-Erkennung nicht verfügbar. Manueller Modus aktiv.");
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
    getCurrentSlideInfo()
      .then((info) => {
        if (!info || !_callbacks) return;
        // Only fire if slide actually changed
        if (info.slideNumber !== _lastReportedSlide) {
          _lastReportedSlide = info.slideNumber;
          _callbacks.onSlideChange(info);
        }
      })
      .catch((e) => {
        _callbacks?.onError(`Folien-Update fehlgeschlagen: ${e}`);
      });
  }, DEBOUNCE_MS);
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
      const title = Office.context.document.url ?? "Präsentation";
      const shortTitle = title.split(/[/\\]/).pop()?.replace(/\.pptx?$/i, "") ?? "Präsentation";

      // Get current slide via SlideRange selection
      Office.context.document.getSelectedDataAsync(
        Office.CoercionType.SlideRange,
        (slideResult) => {
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
            (Office.context.document as any).getSlideCountAsync(
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
  if (!isOfficeInitialized || !isOfficeAvailable()) return;
  try {
    Office.context.document.removeHandlerAsync(
      Office.EventType.DocumentSelectionChanged,
      { handler: handleSelectionChanged }
    );
  } catch {
    // ignore
  }
  _callbacks = null;
  _lastReportedSlide = null;
}
