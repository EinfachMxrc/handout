import Link from "next/link";

export default function HomePage() {
  return (
    <div className="pb-20">
      {/* ── Nav ─────────────────────────────────── */}
      <nav className="page-shell flex items-center justify-between py-5">
        <Link href="/" className="text-lg font-bold tracking-tight" style={{ color: "var(--ink)" }}>
          Slide Handout
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/auth/login" className="text-sm font-medium" style={{ color: "var(--ink-soft)" }}>
            Anmelden
          </Link>
          <Link href="/auth/register" className="btn-primary text-sm">
            Kostenlos starten
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────── */}
      <section className="page-shell mt-12 text-center animate-fade-up">
        <span className="kicker-pill">Für Vorträge, Workshops & Seminare</span>
        <h1 className="mx-auto mt-6 max-w-3xl text-5xl font-bold leading-[1.1] tracking-tight sm:text-6xl text-balance">
          Das Handout, das erst aufdeckt, wenn Sie es sagen.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-balance" style={{ color: "var(--ink-soft)" }}>
          Ihre Zuhörer sehen im Handout nur den Abschnitt, den Sie gerade besprechen.
          Kein Vorblättern, kein Spoilern — und für Ihr Publikum reicht ein Link im Browser.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/auth/register" className="btn-primary px-6 py-3 text-base">
            Jetzt ausprobieren
          </Link>
          <Link href="/auth/login" className="btn-secondary px-6 py-3 text-base">
            Demo ansehen
          </Link>
        </div>
        <p className="mt-4 text-sm" style={{ color: "var(--ink-muted)" }}>
          Keine Kreditkarte · Demo-Account sofort verfügbar
        </p>
      </section>

      {/* ── Mockup / Demo Visual ────────────────── */}
      <section className="page-shell mt-16">
        <div className="overflow-hidden rounded-xl border shadow-lg" style={{ borderColor: "var(--line)", background: "var(--paper-strong)" }}>
          <div className="flex items-center gap-2 border-b px-4 py-3" style={{ borderColor: "var(--line)", background: "var(--paper-alt)" }}>
            <div className="flex gap-1.5">
              <span className="h-3 w-3 rounded-full bg-red-400/70" />
              <span className="h-3 w-3 rounded-full bg-yellow-400/70" />
              <span className="h-3 w-3 rounded-full bg-green-400/70" />
            </div>
            <span className="ml-2 text-xs" style={{ color: "var(--ink-muted)" }}>slide-handout.app/h/demo</span>
          </div>
          <div className="grid gap-0 lg:grid-cols-[280px_1fr]">
            {/* Sidebar: Presenter-Sicht */}
            <div className="border-r p-5 lg:block" style={{ borderColor: "var(--line)", background: "var(--paper-alt)" }}>
              <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ink-muted)" }}>Presenter-Steuerung</div>
              <div className="mt-4 text-center">
                <div className="text-5xl font-bold" style={{ color: "var(--accent-text)" }}>5</div>
                <div className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>Aktuelle Folie</div>
              </div>
              <div className="mt-5 space-y-2">
                {[
                  { name: "Einleitung", slide: "1", active: true },
                  { name: "Grundlagen", slide: "3", active: true },
                  { name: "Fallbeispiel", slide: "5", active: true },
                  { name: "Ergebnisse", slide: "8", active: false },
                  { name: "Fazit", slide: "12", active: false },
                ].map((b) => (
                  <div key={b.name} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm" style={{ background: b.active ? "var(--green-soft)" : "transparent" }}>
                    <span className={`h-2 w-2 rounded-full ${b.active ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"}`} />
                    <span className="flex-1 font-medium" style={{ color: b.active ? "var(--ink)" : "var(--ink-muted)" }}>{b.name}</span>
                    <span className="text-xs" style={{ color: "var(--ink-muted)" }}>Folie {b.slide}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Main: Reader-Sicht */}
            <div className="p-6 sm:p-8">
              <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ink-muted)" }}>Ansicht Ihres Publikums</div>
              <div className="mt-5 space-y-4">
                {[
                  { title: "Einleitung", text: "Überblick über die Ziele und den Ablauf der heutigen Präsentation." },
                  { title: "Grundlagen", text: "Die wichtigsten Begriffe und Definitionen, die Sie für das Verständnis brauchen." },
                  { title: "Fallbeispiel", text: "Konkrete Zahlen und Ergebnisse aus der Pilotphase mit drei Partnerunternehmen." },
                ].map((block) => (
                  <div key={block.title} className="rounded-lg border p-4" style={{ borderColor: "var(--line)" }}>
                    <h3 className="text-base font-semibold">{block.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>{block.text}</p>
                  </div>
                ))}
                <div className="rounded-lg border-2 border-dashed p-4 text-center" style={{ borderColor: "var(--line)" }}>
                  <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
                    Weitere Abschnitte erscheinen, sobald die passende Folie erreicht wird…
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── So funktioniert's ───────────────────── */}
      <section className="mt-24">
        <div className="page-shell text-center">
          <span className="kicker-pill">In drei Schritten</span>
          <h2 className="mx-auto mt-4 max-w-xl text-3xl font-bold sm:text-4xl">
            So einfach funktioniert Slide Handout
          </h2>
        </div>

        <div className="page-shell mt-12 grid gap-8 lg:grid-cols-3">
          {[
            {
              num: "1",
              title: "Handout schreiben",
              text: "Erstellen Sie Abschnitte im Editor und legen Sie pro Block fest, ab welcher Folie er sichtbar wird. Markdown wird unterstützt.",
            },
            {
              num: "2",
              title: "Link teilen",
              text: "Starten Sie eine Session und teilen Sie den Link oder QR-Code — vor dem Vortrag oder live auf der Leinwand.",
            },
            {
              num: "3",
              title: "Vortragen & steuern",
              text: "Schalten Sie Folien weiter — manuell im Dashboard oder automatisch per PowerPoint-Add-in. Die Inhalte erscheinen beim Publikum.",
            },
          ].map((step) => (
            <div key={step.num} className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white" style={{ background: "var(--accent)" }}>
                {step.num}
              </div>
              <h3 className="mt-4 text-xl font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Vorteile ────────────────────────────── */}
      <section className="mt-24 py-16" style={{ background: "var(--paper-alt)" }}>
        <div className="page-shell">
          <div className="text-center">
            <span className="kicker-pill">Warum Slide Handout?</span>
            <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-bold sm:text-4xl">
              Was es anders macht als ein PDF
            </h2>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Kontrollierte Freigabe",
                text: "Ihr Publikum liest nur, was Sie gerade besprechen. Keine Spoiler, kein Vorblättern durch 40 Seiten.",
              },
              {
                title: "Immer aktuell",
                text: "Ändern Sie einen Tippfehler im Editor — das Publikum sieht sofort die korrigierte Version. Keine neuen PDFs verschicken.",
              },
              {
                title: "Kein Login für Zuhörer",
                text: "QR-Code scannen oder Link öffnen — das reicht. Funktioniert auf jedem Gerät mit Browser.",
              },
              {
                title: "PowerPoint-Integration",
                text: "Das Add-in meldet Folienwechsel automatisch an Slide Handout. Sie müssen nichts manuell umschalten.",
              },
              {
                title: "Manuelle Blöcke",
                text: "Manche Inhalte sollen erst auf Knopfdruck erscheinen? Kein Problem — manuell freigegebene Blöcke sind eingebaut.",
              },
              {
                title: "Druckbar",
                text: "Nach dem Vortrag können Zuhörer das komplette Handout als PDF speichern oder direkt ausdrucken.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border p-5" style={{ borderColor: "var(--line)", background: "var(--paper-strong)" }}>
                <h3 className="text-base font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Zielgruppen ─────────────────────────── */}
      <section className="page-shell mt-24">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="kicker-pill">Für wen?</span>
            <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
              Gebaut für alle, die live präsentieren
            </h2>
            <p className="mt-4 text-base leading-relaxed" style={{ color: "var(--ink-soft)" }}>
              Egal ob Hörsaal, Meetingraum oder Konferenzbühne —
              überall dort, wo Zuhörer Begleitmaterial brauchen, aber nicht
              alles auf einmal sehen sollen.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { who: "Dozierende", what: "Vorlesungsskripte, die dem Lehrplan folgen statt ihn vorwegnehmen." },
              { who: "Trainer & Coaches", what: "Workshop-Unterlagen, die schrittweise mit den Übungen aufgebaut werden." },
              { who: "Speaker", what: "Konferenz-Handouts, die Zuhörer im Takt des Vortrags erhalten." },
              { who: "Unternehmen", what: "Interne Präsentationen mit kontrollierten Unterlagen statt loser PDF-Sammlungen." },
            ].map((item) => (
              <div key={item.who} className="rounded-xl border p-4" style={{ borderColor: "var(--line)", background: "var(--paper-strong)" }}>
                <div className="text-sm font-semibold" style={{ color: "var(--accent-text)" }}>{item.who}</div>
                <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>{item.what}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────── */}
      <section className="page-shell mt-24">
        <div className="rounded-xl p-8 text-center sm:p-12" style={{ background: "var(--accent-soft)", border: "1px solid var(--accent)", borderColor: "rgba(79,70,229,0.2)" }}>
          <h2 className="text-3xl font-bold sm:text-4xl">Bereit für bessere Handouts?</h2>
          <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed" style={{ color: "var(--ink-soft)" }}>
            Erstellen Sie Ihren kostenlosen Account oder testen Sie alles sofort
            mit dem Demo-Zugang.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/auth/register" className="btn-primary px-6 py-3 text-base">
              Kostenlos starten
            </Link>
            <div className="flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm" style={{ borderColor: "var(--line)", background: "var(--paper-strong)" }}>
              <span style={{ color: "var(--ink-muted)" }}>Demo:</span>
              <code className="font-medium">demo@example.com</code>
              <span style={{ color: "var(--ink-muted)" }}>/</span>
              <code className="font-medium">demo1234</code>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────── */}
      <footer className="page-shell mt-16 flex flex-wrap items-center justify-between gap-4 border-t py-6" style={{ borderColor: "var(--line)" }}>
        <span className="text-sm font-medium" style={{ color: "var(--ink-muted)" }}>Slide Handout</span>
        <div className="flex gap-4 text-sm" style={{ color: "var(--ink-muted)" }}>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/powerpoint">PowerPoint</Link>
          <Link href="/auth/login">Login</Link>
        </div>
      </footer>
    </div>
  );
}
