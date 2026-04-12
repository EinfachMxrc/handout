import Link from "next/link";

export default function PowerPointInstallPage() {
  return (
    <div className="page-shell py-12 space-y-12">
      {/* Header */}
      <div className="max-w-2xl">
        <Link href="/" className="text-sm font-medium" style={{ color: "var(--accent-text)" }}>
          ← Zurück zur Startseite
        </Link>
        <h1 className="mt-4 text-3xl font-bold sm:text-4xl">PowerPoint Add-in</h1>
        <p className="mt-3 text-base leading-relaxed" style={{ color: "var(--ink-soft)" }}>
          Das Add-in meldet Folienwechsel automatisch an Slide Handout.
          Sie laden ein Manifest herunter, fügen es in PowerPoint ein und steuern
          Ihre Sessions direkt aus der Präsentation.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href="/powerpoint/manifest" className="btn-primary">
            Manifest herunterladen
          </a>
          <Link href="/powerpoint/addin" target="_blank" rel="noreferrer" className="btn-secondary">
            Add-in im Browser testen
          </Link>
        </div>
      </div>

      {/* Steps */}
      <div className="grid gap-6 sm:grid-cols-3">
        {[
          {
            num: "1",
            title: "Manifest laden",
            text: "Die XML-Datei enthält bereits die gehostete URL und muss nicht angepasst werden.",
          },
          {
            num: "2",
            title: "In PowerPoint einfügen",
            text: "Über Einfügen → Add-Ins → Eigene Add-Ins hochladen und die XML-Datei auswählen.",
          },
          {
            num: "3",
            title: "Session wählen",
            text: "Im Taskpane anmelden und die passende Session für Ihren Vortrag auswählen.",
          },
        ].map((step) => (
          <div key={step.num} className="card">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-white" style={{ background: "var(--accent)" }}>
              {step.num}
            </div>
            <h3 className="mt-3 text-lg font-semibold">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>{step.text}</p>
          </div>
        ))}
      </div>

      {/* Info Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h3 className="text-lg font-semibold">Ablauf im Vortrag</h3>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>
            Der Vortrag bleibt in PowerPoint, die Reveal-Logik und Reader-Ansicht
            in Slide Handout. Bei jedem Folienwechsel meldet das Add-in die aktuelle
            Folie — Ihre Handout-Abschnitte erscheinen automatisch.
          </p>
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold">Gut zu wissen</h3>
          <div className="mt-2 space-y-2 text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>
            <p>
              Für Einzelpersonen reicht der Manifest-Upload. Für Organisationen
              braucht es Microsoft-Admin-Deployment oder AppSource.
            </p>
            <p>
              Der Demo-Account ist schreibgeschützt — im Add-in können Demo-Nutzer
              keine Sessions steuern.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
