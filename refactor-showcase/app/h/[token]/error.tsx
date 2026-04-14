"use client";

import { useEffect } from "react";

/** Reader-spezifischer Error Boundary — verhindert, dass globaler Error in den Reader-Kontext eingreift. */
export default function ReaderError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ReaderError]", error);
  }, [error]);

  return (
    <div className="page-shell flex min-h-screen items-center justify-center py-10">
      <div className="section-panel max-w-md text-center">
        <div className="eyebrow text-rose-500">Reader-Fehler</div>
        <h1 className="mt-3 text-2xl font-bold">Handout konnte nicht geladen werden</h1>
        <p className="mt-3 text-sm" style={{ color: "var(--ink-soft)" }}>
          Möglicherweise ist die Session beendet oder der Link ungültig.
        </p>
        <button onClick={reset} className="btn-primary mt-6">
          Erneut laden
        </button>
      </div>
    </div>
  );
}
