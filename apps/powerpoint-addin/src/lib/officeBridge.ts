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
 * In EDIT mode (Normal view): SlideSelectionChanged event works reliably.
 * In SLIDESHOW mode: Office.js has limited access. The add-in taskpane
 *   is often suspended during fullscreen slideshow. No reliable event.
 * → Auto-sync works in Normal/Edit view. Manual/Hybrid fallback in slideshow.
 *
 * This bridge detects which mode is available and reports it honestly.
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
let _cleanupFn: (() => void) | null = null;

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
      // Running in plain browser – no Office.js
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

      // Register slide selection change event (works in Normal view)
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
      } catch (e) {
        callbacks.onError("Slide-Erkennung nicht verfügbar. Manueller Modus aktiv.");
        resolve("hybrid");
      }
    });
  });
}

function handleSelectionChanged() {
  if (!_callbacks) return;
  getCurrentSlideInfo()
    .then((info) => {
      if (info) _callbacks!.onSlideChange(info);
    })
    .catch((e) => {
      _callbacks?.onError(`Folien-Update fehlgeschlagen: ${e}`);
    });
}

/**
 * Get current slide info from Office.js.
 * Returns null if not available.
 */
export function getCurrentSlideInfo(): Promise<OfficeSlideInfo | null> {
  return new Promise((resolve) => {
    if (!isOfficeInitialized || !isOfficeAvailable()) {
      resolve(null);
      return;
    }

    try {
      // Get presentation title
      const title = Office.context.document.url ?? "Präsentation";
      const shortTitle = title.split(/[/\\]/).pop()?.replace(/\.pptx?$/i, "") ?? "Präsentation";

      // Get current slide index using ActiveView
      Office.context.document.getActiveViewAsync((viewResult) => {
        if (viewResult.status === Office.AsyncResultStatus.Failed) {
          resolve(null);
          return;
        }

        // Get slide selection
        Office.context.document.getSelectedDataAsync(
          Office.CoercionType.SlideRange,
          (slideResult) => {
            if (slideResult.status === Office.AsyncResultStatus.Failed) {
              // Can't get slide info in this view mode
              resolve(null);
              return;
            }

            try {
              const slideData = slideResult.value as any;
              const slides = slideData?.slides;
              if (slides && slides.length > 0) {
                const currentSlide = slides[0].index + 1; // 0-based to 1-based
                const total = (Office.context.document as any)._slideCount ?? undefined;

                resolve({
                  slideNumber: currentSlide,
                  totalSlides: total ?? currentSlide,
                  presentationTitle: shortTitle,
                });
              } else {
                resolve(null);
              }
            } catch {
              resolve(null);
            }
          }
        );
      });
    } catch {
      resolve(null);
    }
  });
}

/**
 * Clean up event handlers.
 */
export function destroyOfficeBridge() {
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
  _cleanupFn = null;
}
