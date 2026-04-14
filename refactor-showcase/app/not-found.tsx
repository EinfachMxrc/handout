import Link from "next/link";

/** 404-Page für den App-Router (Server Component, null JS-Overhead). */
export default function NotFound() {
  return (
    <div className="page-shell flex min-h-screen items-center justify-center py-10">
      <div className="section-panel max-w-md text-center">
        <div className="eyebrow">404</div>
        <h1 className="mt-3 text-2xl font-bold">Seite nicht gefunden</h1>
        <p className="mt-3 text-sm" style={{ color: "var(--ink-soft)" }}>
          Die gesuchte Seite existiert nicht oder wurde verschoben.
        </p>
        <Link href="/" className="btn-primary mt-6 inline-block">
          Zur Startseite
        </Link>
      </div>
    </div>
  );
}
