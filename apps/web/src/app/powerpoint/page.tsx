import Link from "next/link";

const installSteps = [
  {
    title: "Manifest laden",
    body: "Die XML-Datei enthaelt bereits die gehostete URL fuer das Taskpane und muss nicht mehr manuell angepasst werden.",
  },
  {
    title: "In PowerPoint hochladen",
    body: "Nutzen Sie Einfuegen > Add-Ins > Eigene Add-Ins > Add-In hochladen und waehlen Sie die geladene XML aus.",
  },
  {
    title: "Session auswaehlen",
    body: "Im Taskpane mit Ihrem Presenter-Account anmelden und die passende Session fuer den Vortrag waehlen.",
  },
];

export default function PowerPointInstallPage() {
  return (
    <div className="pb-16 pt-8">
      <div className="page-shell space-y-8">
        <section className="page-hero">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <span className="kicker-pill">PowerPoint add-in</span>
              <h1 className="page-title text-5xl sm:text-6xl">
                Slide Handout direkt in PowerPoint steuern.
              </h1>
              <p className="page-copy max-w-2xl">
                Das Add-in laeuft auf derselben Domain wie die Web-App. Sie
                laden nur noch das Manifest herunter, fuegen es in PowerPoint
                ein und arbeiten danach im Taskpane mit Ihrem normalen Presenter-Account.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <a href="/powerpoint/manifest" className="btn-primary">
                  Manifest herunterladen
                </a>
                <Link href="/powerpoint/addin" target="_blank" rel="noreferrer" className="btn-secondary">
                  Add-in im Browser testen
                </Link>
              </div>
            </div>

            <div className="card">
              <div className="eyebrow">Hinweis</div>
              <h2 className="mt-3 text-3xl">Distribution ohne Token-Kopieren</h2>
              <p className="page-copy mt-3 max-w-none">
                Das Taskpane braucht keine manuell uebergebenen Presenter-Tokens mehr.
                Die Session-Auswahl geschieht nach dem Login direkt im Add-in.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {installSteps.map((step) => (
            <article key={step.title} className="section-panel">
              <div className="eyebrow">Install</div>
              <h2 className="mt-3 text-3xl">{step.title}</h2>
              <p className="page-copy mt-3 max-w-none">{step.body}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="section-panel">
            <div className="eyebrow">Ablauf im Vortrag</div>
            <h2 className="mt-3 text-4xl">Ein Reader, ein Dashboard, ein Add-in.</h2>
            <p className="page-copy">
              Der Vortrag bleibt in PowerPoint, die Reveal-Logik und Leseransicht
              bleiben in Slide Handout. So muessen Sie nicht zwischen zwei
              komplett getrennten Systemen denken.
            </p>
          </div>

          <div className="section-panel">
            <div className="eyebrow">Wichtige Hinweise</div>
            <div className="mt-4 space-y-3 text-sm leading-7 text-stone-700">
              <p>
                Fuer Einzelpersonen bleibt der Manifest-Upload der schnellste Weg.
                Ein echtes One-Click-Rollout fuer ganze Organisationen braucht
                Microsoft-Admin-Deployment oder spaeter AppSource.
              </p>
              <p>
                Der Demo-Account bleibt absichtlich schreibgeschuetzt. Im Add-in
                koennen Demo-Nutzer deshalb keine Sessions steuern.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
