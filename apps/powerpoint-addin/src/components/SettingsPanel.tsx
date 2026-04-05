import { useState } from "react";
import { useAddinStore } from "../store/addinStore";

interface SettingsPanelProps {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const store = useAddinStore();

  const [convexUrl, setConvexUrl] = useState(store.convexUrl);
  const [presenterToken, setPresenterToken] = useState(store.presenterToken);
  const [sessionId, setSessionId] = useState(store.sessionId);

  const handleSave = () => {
    store.setConnectionInfo({ convexUrl, presenterToken, sessionId });
    // Reload page to re-initialize Convex client with new URL
    window.location.reload();
  };

  const handleClear = () => {
    store.setConnectionInfo({ convexUrl: "", presenterToken: "", sessionId: "" });
    store.reset();
    onClose();
  };

  return (
    <div className="p-3 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Einstellungen</h2>
        <button className="btn-secondary" onClick={onClose}>✕</button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Convex URL
          </label>
          <input
            className="input-sm"
            value={convexUrl}
            onChange={(e) => setConvexUrl(e.target.value)}
            placeholder="https://xxx.convex.cloud"
          />
          <p className="text-xs text-gray-400 mt-0.5">
            Aus .env.local oder Convex-Dashboard
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Presenter-Token
          </label>
          <input
            className="input-sm font-mono"
            value={presenterToken}
            onChange={(e) => setPresenterToken(e.target.value)}
            placeholder="Nach Login aus Dashboard kopieren"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Session-ID
          </label>
          <input
            className="input-sm font-mono"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            placeholder="Session-ID aus Dashboard"
          />
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs text-blue-700">
        <p className="font-medium mb-1">So finden Sie die Werte:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Web-App öffnen → Anmelden</li>
          <li>Session erstellen / öffnen</li>
          <li>URL enthält Session-ID</li>
          <li>Presenter-Token: nach Login im localStorage</li>
        </ol>
      </div>

      <div className="flex gap-2">
        <button className="btn-primary flex-1" onClick={handleSave}>
          Speichern & Neu laden
        </button>
        <button className="btn-danger text-xs" onClick={handleClear}>
          Trennen
        </button>
      </div>
    </div>
  );
}
