import { useEffect, useState, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { useAddinStore } from "./store/addinStore";
import {
  initOfficeBridge,
  destroyOfficeBridge,
  isOfficeAvailable,
  type SyncCapability,
} from "./lib/officeBridge";
import { SlideSimulator } from "./lib/simulator";
import { SettingsPanel } from "./components/SettingsPanel";
import { SimulatorPanel } from "./components/SimulatorPanel";
import { ConnectionStatus } from "./components/ConnectionStatus";
import { api } from "../../../convex/_generated/api";

interface AppProps {
  convexReady: boolean;
}

export function App({ convexReady }: AppProps) {
  const store = useAddinStore();
  const simulatorRef = useRef<SlideSimulator | null>(null);

  const [officeMode, setOfficeMode] = useState<"unknown" | SyncCapability>("unknown");

  const setCurrentSlide = useMutation(api.sessions.setCurrentSlide);

  const _sessionData = useQuery(
    api.sessions.getPresenterSessionState,
    convexReady && store.sessionId && store.presenterToken
      ? { token: store.presenterToken, sessionId: store.sessionId as any }
      : "skip"
  );

  // Initialize Office.js bridge on mount
  useEffect(() => {
    const officeAvail = isOfficeAvailable();
    store.setOfficeAvailable(officeAvail);

    if (officeAvail && store.sessionId && store.presenterToken) {
      initOfficeBridge({
        onSlideChange: (info) => {
          store.setLastKnownSlide(info.slideNumber);
          syncSlide(info.slideNumber, info.totalSlides, info.presentationTitle);
        },
        onModeChange: (mode) => {
          setOfficeMode(mode);
          store.setSyncStatus(mode === "auto" ? "auto" : mode === "hybrid" ? "hybrid" : "manual_only");
        },
        onError: (err) => {
          store.setConnectionError(err);
          setOfficeMode("hybrid");
          store.setSyncStatus("hybrid");
        },
      }).then((capability) => {
        setOfficeMode(capability);
        store.setSyncStatus(capability === "auto" ? "auto" : capability === "hybrid" ? "hybrid" : "manual_only");
      });

      return () => destroyOfficeBridge();
    } else if (!officeAvail) {
      // Running in browser / dev mode – use manual/simulator mode
      setOfficeMode("manual_only");
      store.setSyncStatus("manual_only");
    }
  }, [convexReady, store.sessionId, store.presenterToken]);

  const syncSlide = async (slideNumber: number, totalSlides?: number, title?: string) => {
    if (!convexReady || !setCurrentSlide || !store.sessionId || !store.presenterToken) return;

    store.setIsSyncing(true);
    try {
      await setCurrentSlide({
        token: store.presenterToken,
        sessionId: store.sessionId,
        slideNumber,
        totalSlides,
        presentationTitle: title,
      });
    } catch (err: any) {
      store.setConnectionError(err.message);
    } finally {
      store.setIsSyncing(false);
    }
  };

  // Manual controls (used in hybrid/manual mode)
  const handleManualNext = () => {
    const nextSlide = store.lastKnownSlide + 1;
    store.setLastKnownSlide(nextSlide);
    syncSlide(nextSlide);
  };

  const handleManualPrev = () => {
    const prevSlide = Math.max(1, store.lastKnownSlide - 1);
    store.setLastKnownSlide(prevSlide);
    syncSlide(prevSlide);
  };

  const handleSimulatorSlideChange = (slideNumber: number, total: number) => {
    store.setLastKnownSlide(slideNumber);
    syncSlide(slideNumber, total, "Simulator");
  };

  if (store.isSettingsOpen) {
    return <SettingsPanel onClose={() => store.setIsSettingsOpen(false)} />;
  }

  const isConnected = !!(store.sessionId && store.presenterToken && convexReady);

  return (
    <div className="p-3 space-y-3 max-w-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>📑</span>
          <span className="font-semibold text-gray-900">Slide Handout</span>
        </div>
        <button
          className="btn-secondary"
          onClick={() => store.setIsSettingsOpen(true)}
        >
          Einstellungen
        </button>
      </div>

      {/* Connection status */}
      <ConnectionStatus
        isConnected={isConnected}
        convexReady={convexReady}
        syncStatus={store.syncStatus}
        isOfficeAvailable={store.isOfficeAvailable}
        isSyncing={store.isSyncing}
        error={store.connectionError}
      />

      {!isConnected ? (
        <div className="text-xs text-gray-600 bg-yellow-50 border border-yellow-200 rounded p-3">
          <p className="font-medium mb-1">Nicht verbunden</p>
          <p>Öffnen Sie die Einstellungen und geben Sie Ihre Session-Zugangsdaten ein.</p>
          <button
            className="btn-primary mt-2 w-full"
            onClick={() => store.setIsSettingsOpen(true)}
          >
            Einstellungen öffnen
          </button>
        </div>
      ) : (
        <>
          {/* Current slide display */}
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-3xl font-bold text-gray-900">{store.lastKnownSlide}</div>
            <div className="text-xs text-gray-500">Aktuelle Folie</div>
          </div>

          {/* Manual controls (always shown for reliability) */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Manuelle Steuerung</p>
            <div className="flex gap-2">
              <button className="btn-secondary flex-1" onClick={handleManualPrev}>
                ← Zurück
              </button>
              <button className="btn-primary flex-1" onClick={handleManualNext}>
                Weiter →
              </button>
            </div>
          </div>

          {/* Sync mode explanation */}
          {store.syncStatus === "auto" && (
            <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded p-2">
              Auto-Sync aktiv: Folienänderungen in PowerPoint werden automatisch erkannt.
            </div>
          )}
          {store.syncStatus === "hybrid" && (
            <div className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-2">
              Hybrid-Modus: Auto-Sync versucht Erkennung, manuelle Tasten als Fallback.
            </div>
          )}
          {store.syncStatus === "manual_only" && !store.isOfficeAvailable && (
            <SimulatorPanel
              onSlideChange={handleSimulatorSlideChange}
              currentSlide={store.lastKnownSlide}
              totalSlides={store.simulatorTotalSlides}
            />
          )}
          {store.syncStatus === "manual_only" && store.isOfficeAvailable && (
            <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded p-2">
              Manueller Modus: Nutzen Sie die Tasten oben, um die Folie zu setzen.
            </div>
          )}
        </>
      )}
    </div>
  );
}
