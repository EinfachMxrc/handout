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
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

const DEBOUNCE_MS = 250;

export function isOfficeAvailable(): boolean {
  return typeof Office !== "undefined" && typeof Office.context !== "undefined";
}

export function initOfficeBridge(
  callbacks: OfficeBridgeCallbacks
): Promise<SyncCapability> {
  activeCallbacks = callbacks;

  return new Promise((resolve) => {
    if (!isOfficeAvailable()) {
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

      try {
        Office.context.document.addHandlerAsync(
          Office.EventType.DocumentSelectionChanged,
          handleSelectionChanged,
          (result: { status: string }) => {
            if (result.status === Office.AsyncResultStatus.Failed) {
              callbacks.onError(
                "Automatischer Sync ist hier nicht verfuegbar. Manueller Modus aktiv."
              );
              callbacks.onModeChange("hybrid");
              resolve("hybrid");
              return;
            }

            callbacks.onModeChange("auto");
            resolve("auto");
          }
        );
      } catch {
        callbacks.onError(
          "PowerPoint meldet keine Folienwechsel. Manueller Modus aktiv."
        );
        callbacks.onModeChange("hybrid");
        resolve("hybrid");
      }
    });
  });
}

function handleSelectionChanged() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    void getCurrentSlideInfo()
      .then((info) => {
        if (!info || !activeCallbacks) {
          return;
        }

        if (info.slideNumber !== lastReportedSlide) {
          lastReportedSlide = info.slideNumber;
          activeCallbacks.onSlideChange(info);
        }
      })
      .catch((error) => {
        activeCallbacks?.onError(`Folien-Update fehlgeschlagen: ${String(error)}`);
      });
  }, DEBOUNCE_MS);
}

export function getCurrentSlideInfo(): Promise<OfficeSlideInfo | null> {
  return new Promise((resolve) => {
    if (!isInitialized || !isOfficeAvailable()) {
      resolve(null);
      return;
    }

    try {
      const rawTitle = Office.context.document.url ?? "Praesentation";
      const presentationTitle =
        rawTitle.split(/[/\\]/).pop()?.replace(/\.pptx?$/i, "") ?? "Praesentation";

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

          (Office.context.document as any).getSlideCountAsync(
            (countResult: { status: string; value: number }) => {
              const totalSlides =
                countResult.status === Office.AsyncResultStatus.Succeeded
                  ? countResult.value
                  : slideNumber;

              resolve({ slideNumber, totalSlides, presentationTitle });
            }
          );
        }
      );
    } catch {
      resolve(null);
    }
  });
}

export function destroyOfficeBridge() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }

  if (!isInitialized || !isOfficeAvailable()) {
    activeCallbacks = null;
    lastReportedSlide = null;
    return;
  }

  try {
    Office.context.document.removeHandlerAsync(
      Office.EventType.DocumentSelectionChanged,
      { handler: handleSelectionChanged }
    );
  } catch {
    // Ignore cleanup failures when Office already disposed the taskpane.
  }

  activeCallbacks = null;
  lastReportedSlide = null;
}
