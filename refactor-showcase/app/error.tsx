"use client";

import { useEffect } from "react";

/**
 * Globaler Error Boundary für den App-Router.
 * Fängt Fehler in allen darunterliegenden Route-Segmenten ab und bietet Recovery via reset().
 * Loggt den Fehler an die Konsole — produktiv würde hier Sentry / OpenTelemetry hängen.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="page-shell flex min-h-screen items-center justify-center py-10">
      <div className="section-panel max-w-md text-center">
        <div className="eyebrow text-rose-500">Etwas ist schiefgelaufen</div>
        <h1 className="mt-3 text-2xl font-bold">Unerwarteter Fehler</h1>
        <p className="mt-3 text-sm" style={{ color: "var(--ink-soft)" }}>
          Bitte versuche es erneut. Falls das Problem bestehen bleibt, lade die Seite neu.
        </p>
        {error.digest && (
          <p className="mt-2 text-xs font-mono" style={{ color: "var(--ink-muted)" }}>
            Referenz: {error.digest}
          </p>
        )}
        <button onClick={reset} className="btn-primary mt-6">
          Erneut versuchen
        </button>
      </div>
    </div>
  );
}
