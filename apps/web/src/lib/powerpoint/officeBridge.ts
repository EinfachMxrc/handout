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
let pollTimer: ReturnType<typeof setInterval> | null = null;

const DEBOUNCE_MS = 150;
const POLL_MS = 800;

export function isOfficeAvailable(): boolean {
  return typeof Office !== "undefined" && typeof Office.context !== "undefined";
}

function isPowerPointApiAvailable(): boolean {
  return (
    isOfficeAvailable() &&
    typeof (globalThis as any).PowerPoint !== "undefined" &&
    typeof (globalThis as any).PowerPoint.run === "function"
  );
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
      void syncCurrentSlide();
      startPolling();

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
            try {
              Office.context.document.addHandlerAsync(
                Office.EventType.ActiveViewChanged,
                handleActiveViewChanged
              );
            } catch {
              // Ignore optional view change registration failures.
            }
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
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    void syncCurrentSlide();
  }, DEBOUNCE_MS);
}

function handleActiveViewChanged() {
  handleSelectionChanged();
}

async function syncCurrentSlide() {
  try {
    const info = await getCurrentSlideInfo();
    if (!info || !activeCallbacks) return;

    if (info.slideNumber !== lastReportedSlide) {
      lastReportedSlide = info.slideNumber;
      activeCallbacks.onSlideChange(info);
    }
  } catch (error) {
    activeCallbacks?.onError(`Folien-Update fehlgeschlagen: ${String(error)}`);
  }
}

function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    void syncCurrentSlide();
  }, POLL_MS);
}

/**
 * Gets the current slide info.
 *
 * Uses the modern PowerPoint JS API (PowerPoint.run + getSelectedSlides) as
 * primary method — this works regardless of whether the taskpane or the
 * presentation canvas has keyboard focus.
 *
 * Falls back to the legacy getSelectedDataAsync(SlideRange) for older Office
 * versions that don't support PowerPointApi 1.5.
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

          // getSelectedSlides requires PowerPointApi 1.5 — wrap in try/catch
          let selectedSlides: any = null;
          try {
            selectedSlides = context.presentation.getSelectedSlides();
            selectedSlides.load("items/id");
          } catch {
            // Not available in this Office version; fall through to legacy API.
          }

          await context.sync();

          const totalSlides: number = allSlides.items.length;

          if (selectedSlides && selectedSlides.items.length > 0) {
            const selectedId: string = selectedSlides.items[0].id;
            const allIds: string[] = allSlides.items.map((s: any) => s.id);
            const idx = allIds.indexOf(selectedId);
            if (idx >= 0) {
              resolve({ slideNumber: idx + 1, totalSlides, presentationTitle });
              return;
            }
          }

          // PowerPoint.run succeeded but couldn't determine selected slide
          // (getSelectedSlides unavailable). Fall back to legacy API.
          legacyGetSlideInfo(presentationTitle, resolve);
        } catch {
          legacyGetSlideInfo(presentationTitle, resolve);
        }
      }).catch(() => {
        legacyGetSlideInfo(presentationTitle, resolve);
      });
      return;
    }

    legacyGetSlideInfo(presentationTitle, resolve);
  });
}

function legacyGetSlideInfo(
  presentationTitle: string,
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
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
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
    Office.context.document.removeHandlerAsync(
      Office.EventType.ActiveViewChanged,
      { handler: handleActiveViewChanged }
    );
  } catch {
    // Ignore cleanup failures when Office already disposed the taskpane.
  }
  isInitialized = false;
  activeCallbacks = null;
  lastReportedSlide = null;
}
