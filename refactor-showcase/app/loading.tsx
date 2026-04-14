/** Root-Suspense-Fallback. Wird automatisch angezeigt, solange RSC-Daten geladen werden. */
export default function Loading() {
  return (
    <div className="page-shell flex min-h-screen items-center justify-center py-10">
      <div
        className="h-10 w-10 animate-spin rounded-full border-2 border-current border-t-transparent"
        style={{ color: "var(--accent)" }}
        role="status"
        aria-label="Lade…"
      />
    </div>
  );
}
