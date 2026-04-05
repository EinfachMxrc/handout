import type { SyncStatus } from "../store/addinStore";

interface ConnectionStatusProps {
  isConnected: boolean;
  convexReady: boolean;
  syncStatus: SyncStatus;
  isOfficeAvailable: boolean;
  isSyncing: boolean;
  error: string | null;
}

export function ConnectionStatus({
  isConnected,
  convexReady,
  syncStatus,
  isOfficeAvailable,
  isSyncing,
  error,
}: ConnectionStatusProps) {
  const syncLabels: Record<SyncStatus, string> = {
    auto: "Auto-Sync",
    hybrid: "Hybrid",
    manual_only: isOfficeAvailable ? "Manuell" : "Simulator",
  };

  const syncColors: Record<SyncStatus, string> = {
    auto: "text-green-700 bg-green-50 border-green-200",
    hybrid: "text-yellow-700 bg-yellow-50 border-yellow-200",
    manual_only: "text-gray-700 bg-gray-50 border-gray-200",
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-gray-300"}`}
        />
        <span className="text-xs text-gray-600">
          {!convexReady
            ? "Convex nicht konfiguriert"
            : isConnected
            ? "Verbunden"
            : "Nicht verbunden"}
        </span>
        {isSyncing && (
          <span className="ml-auto text-xs text-blue-600 animate-pulse">Syncing...</span>
        )}
      </div>

      {isConnected && (
        <div className={`text-xs px-2 py-1 rounded border ${syncColors[syncStatus]}`}>
          {syncLabels[syncStatus]}
          {!isOfficeAvailable && " (kein PowerPoint erkannt)"}
        </div>
      )}

      {error && (
        <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
          {error}
        </div>
      )}
    </div>
  );
}
