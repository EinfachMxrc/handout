import Link from "next/link";

const featureCards = [
  {
    title: "Foliengesteuerte Freigabe",
    body: "Blocks werden entlang Ihrer Präsentation sichtbar, ohne dass Zuschauer vorlesen oder nachfragen müssen.",
  },
  {
    title: "Presenter-Steuerung",
    body: "Dashboard, Session-Ansicht und PowerPoint-Add-in greifen in dieselbe Live-Logik. Sie behalten die Kontrolle über jede Freigabe.",
  },
  {
    title: "Reader statt Datenmüll",
    body: "Das öffentliche Handout fühlt sich wie ein sauber gesetztes Dokument an, nicht wie eine generische Companion-App.",
  },
];

const workflowSteps = [
  "Handout strukturieren und Reveal-Regeln pro Block setzen.",
  "Session starten und den öffentlichen Link per QR oder Direktlink teilen.",
  "Während des Vortrags Slides weiterschalten, Inhalte live freigeben und mit dem Publikum synchron bleiben.",
];

export default function HomePage() {
  return (
    <div className="pb-16 pt-8 sm:pb-20">
      <div className="page-shell">
        <section className="page-hero">
          <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div className="animate-fade-up">
              <span className="kicker-pill">Live handouts for real presentations</span>
              <h1 className="page-title text-balance">
                Ein Handout, das mit Ihrer Präsentation mitdenkt.
              </h1>
              <p className="page-copy text-balance">
                Slide Handout verbindet Vortrag, Publikum und Nachbereitung in
                einer einzigen Lesefläche. Statt PDFs mit zu viel Inhalt
                entsteht ein kontrollierter Reader, der Satz für Satz mit dem
                Vortrag wächst.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/dashboard" className="btn-primary">
                  Dashboard öffnen
                </Link>
                <Link href="/auth/register" className="btn-secondary">
                  Presenter-Account erstellen
                </Link>
                <Link href="/powerpoint" className="btn-secondary">
                  PowerPoint Add-in ansehen
                </Link>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Reveal-Logik", value: "Slide by slide" },
                  { label: "Reader-Ansicht", value: "Live und druckbar" },
                  { label: "Demo", value: "Sofort prüfbar" },
                ].map((item) => (
                  <div key={item.label} className="metric-card">
                    <div className="metric-label">{item.label}</div>
                    <div className="mt-2 text-lg font-semibold">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="animate-soft-float">
              <div className="card relative overflow-hidden">
                <div className="absolute inset-x-6 top-6 h-px bg-gradient-to-r from-transparent via-stone-400/50 to-transparent" />
                <div className="grid gap-5">
                  <div>
                    <div className="eyebrow">Session composition</div>
                    <h2 className="mt-2 text-3xl">Editorial statt Dashboard-Look</h2>
                  </div>

                  <div className="grid gap-3">
                    {[
                      ["Folie 3", "Definitionen entsperrt"],
                      ["Folie 7", "Diagramm und Zahlen live sichtbar"],
                      ["Folie 11", "Q&A-Material freigegeben"],
                    ].map(([label, text], index) => (
                      <div
                        key={label}
                        className="rounded-[24px] border border-stone-800/10 bg-white/70 px-4 py-4"
                        style={{ animationDelay: `${index * 120}ms` }}
                      >
                        <div className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-stone-500">
                          {label}
                        </div>
                        <div className="mt-2 text-base font-semibold text-stone-900">
                          {text}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="soft-note">
                    Demo-Zugang: <code>demo@example.com</code> / <code>demo1234</code>
                    . Der Demo-Account bleibt bewusst schreibgeschützt.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-3">
          {featureCards.map((feature) => (
            <article key={feature.title} className="section-panel">
              <div className="eyebrow">Feature</div>
              <h2 className="mt-3 text-3xl">{feature.title}</h2>
              <p className="page-copy mt-3 max-w-none">{feature.body}</p>
            </article>
          ))}
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="section-panel">
            <div className="eyebrow">Ablauf</div>
            <h2 className="mt-3 text-4xl">Vom Manuskript zur Live-Session</h2>
            <p className="page-copy">
              Die App ist für Vorträge gebaut, bei denen das Publikum die
              richtigen Informationen genau dann sehen soll, wenn Sie dort im
              Raum auch angekommen sind.
            </p>
          </div>

          <div className="grid gap-4">
            {workflowSteps.map((step, index) => (
              <div key={step} className="section-panel flex items-start gap-4">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-stone-800/10 bg-white/80 text-lg font-semibold">
                  0{index + 1}
                </div>
                <p className="text-base leading-7 text-stone-700">{step}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
