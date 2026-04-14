import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "../../../convex/_generated/dataModel";
import { useAddinConnectionStore } from "./store/connectionStore";
import { useAddinSimulatorStore } from "./store/simulatorStore";
import { useAddinUiStore } from "./store/uiStore";
import {
  initOfficeBridge,
  destroyOfficeBridge,
  isOfficeAvailable,
} from "./lib/officeBridge";
import { SettingsPanel } from "./components/SettingsPanel";
import { SimulatorPanel } from "./components/SimulatorPanel";
import { ConnectionStatus } from "./components/ConnectionStatus";
import { api } from "../../../convex/_generated/api";

interface AppProps {
  convexReady: boolean;
}

export function App({ convexReady }: AppProps) {
  const sessionId = useAddinConnectionStore((state) => state.sessionId);
  const presenterToken = useAddinConnectionStore((state) => state.presenterToken);
  const syncStatus = useAddinConnectionStore((state) => state.syncStatus);
  const isOfficeAvailableState = useAddinConnectionStore((state) => state.isOfficeAvailable);
  const isSyncing = useAddinConnectionStore((state) => state.isSyncing);
  const connectionError = useAddinConnectionStore((state) => state.connectionError);
  const lastKnownSlide = useAddinConnectionStore((state) => state.lastKnownSlide);
  const setOfficeAvailableState = useAddinConnectionStore((state) => state.setOfficeAvailable);
  const setSyncStatus = useAddinConnectionStore((state) => state.setSyncStatus);
  const setConnectionError = useAddinConnectionStore((state) => state.setConnectionError);
  const setLastKnownSlide = useAddinConnectionStore((state) => state.setLastKnownSlide);
  const setIsSyncing = useAddinConnectionStore((state) => state.setIsSyncing);

  const simulatorTotalSlides = useAddinSimulatorStore((state) => state.simulatorTotalSlides);
  const isSettingsOpen = useAddinUiStore((state) => state.isSettingsOpen);
  const setIsSettingsOpen = useAddinUiStore((state) => state.setIsSettingsOpen);

  const [slideInput, setSlideInput] = useState("");

  const setCurrentSlide = useMutation(api.sessions.setCurrentSlide);

  const _sessionData = useQuery(
    api.sessions.getPresenterSessionState,
    convexReady && sessionId && presenterToken
      ? { token: presenterToken, sessionId: sessionId as any }
      : "skip"
  );

  const syncSlide = useCallback(
    async (slideNumber: number, totalSlides?: number, title?: string) => {
      if (!convexReady || !sessionId || !presenterToken) return;

      setIsSyncing(true);
      try {
        await setCurrentSlide({
          token: presenterToken,
          sessionId: sessionId as Id<"presentationSessions">,
          slideNumber,
          totalSlides,
          presentationTitle: title,
        });
      } catch (err: any) {
        setConnectionError(err.message);
      } finally {
        setIsSyncing(false);
      }
    },
    [convexReady, presenterToken, sessionId, setConnectionError, setCurrentSlide, setIsSyncing]
  );

  // Initialize Office.js bridge on mount
  useEffect(() => {
    const officeAvail = isOfficeAvailable();
    setOfficeAvailableState(officeAvail);

    if (officeAvail && sessionId && presenterToken) {
      void initOfficeBridge({
        onSlideChange: (info) => {
          setLastKnownSlide(info.slideNumber);
          void syncSlide(info.slideNumber, info.totalSlides, info.presentationTitle);
        },
        onModeChange: (mode) => {
          setSyncStatus(mode === "auto" ? "auto" : mode === "hybrid" ? "hybrid" : "manual_only");
        },
        onError: (err) => {
          setConnectionError(err);
          setSyncStatus("hybrid");
        },
      }).then((capability) => {
        setSyncStatus(capability === "auto" ? "auto" : capability === "hybrid" ? "hybrid" : "manual_only");
      });

      return () => destroyOfficeBridge();
    } else if (!officeAvail) {
      // Running in browser / dev mode – use manual/simulator mode
      setSyncStatus("manual_only");
    }
  }, [presenterToken, sessionId, setConnectionError, setLastKnownSlide, setOfficeAvailableState, setSyncStatus, syncSlide]);

  // Manual controls (used in hybrid/manual mode)
  const handleManualNext = () => {
    const nextSlide = lastKnownSlide + 1;
    setLastKnownSlide(nextSlide);
    void syncSlide(nextSlide);
  };

  const handleManualPrev = () => {
    const prevSlide = Math.max(1, lastKnownSlide - 1);
    setLastKnownSlide(prevSlide);
    void syncSlide(prevSlide);
  };

  const handleSimulatorSlideChange = (slideNumber: number, total: number) => {
    setLastKnownSlide(slideNumber);
    void syncSlide(slideNumber, total, "Simulator");
  };

  if (isSettingsOpen) {
    return <SettingsPanel onClose={() => setIsSettingsOpen(false)} />;
  }

  const isConnected = !!(sessionId && presenterToken && convexReady);

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
          onClick={() => setIsSettingsOpen(true)}
        >
          Einstellungen
        </button>
      </div>

      {/* Connection status */}
      <ConnectionStatus
        isConnected={isConnected}
        convexReady={convexReady}
        syncStatus={syncStatus}
        isOfficeAvailable={isOfficeAvailableState}
        isSyncing={isSyncing}
        error={connectionError}
      />

      {!isConnected ? (
        <div className="text-xs text-gray-600 bg-yellow-50 border border-yellow-200 rounded p-3">
          <p className="font-medium mb-1">Nicht verbunden</p>
          <p>Öffnen Sie die Einstellungen und geben Sie Ihre Session-Zugangsdaten ein.</p>
          <button
            className="btn-primary mt-2 w-full"
            onClick={() => setIsSettingsOpen(true)}
          >
            Einstellungen öffnen
          </button>
        </div>
      ) : (
        <>
          {/* Current slide display */}
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-3xl font-bold text-gray-900">{lastKnownSlide}</div>
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

          {/* Direkte Foliennummer-Eingabe (hilfreich im Vollbild-Modus) */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Folie direkt eingeben</p>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const n = parseInt(slideInput, 10);
                if (!isNaN(n) && n >= 1) {
                  setLastKnownSlide(n);
                  void syncSlide(n);
                  setSlideInput("");
                }
              }}
            >
              <input
                type="number"
                min={1}
                value={slideInput}
                onChange={(e) => setSlideInput(e.target.value)}
                placeholder="Nr."
                className="input-sm w-16 text-center"
              />
              <button type="submit" className="btn-secondary flex-1 text-xs">
                Setzen
              </button>
            </form>
          </div>

          {/* Sync mode explanation */}
          {syncStatus === "auto" && (
            <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded p-2">
              Auto-Sync aktiv: Folienänderungen in PowerPoint werden automatisch erkannt.
            </div>
          )}
          {syncStatus === "hybrid" && (
            <div className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-2">
              Hybrid-Modus: Auto-Sync versucht Erkennung, manuelle Tasten als Fallback.
            </div>
          )}
          {syncStatus === "manual_only" && !isOfficeAvailableState && (
            <SimulatorPanel
              onSlideChange={handleSimulatorSlideChange}
              currentSlide={lastKnownSlide}
              totalSlides={simulatorTotalSlides}
            />
          )}
          {syncStatus === "manual_only" && isOfficeAvailableState && (
            <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded p-2">
              Manueller Modus: Nutzen Sie die Tasten oben, um die Folie zu setzen.
            </div>
          )}
        </>
      )}
    </div>
  );
}
