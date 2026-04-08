import Link from "next/link";

export default function PowerPointInstallPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#dbeafe,_transparent_42%),linear-gradient(180deg,#0f172a_0%,#111827_100%)] px-6 py-16 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-200">
              PowerPoint Add-in
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
              Slide Handout direkt in PowerPoint steuern
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300">
              Das Add-in laeuft jetzt auf derselben Vercel-Domain wie die Web-App.
              Sie laden nur noch das Manifest herunter, fuegen es in PowerPoint
              hinzu und melden sich danach im Taskpane mit Ihrem normalen
              Presenter-Account an.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a href="/powerpoint/manifest" className="btn-primary text-base">
                Manifest herunterladen
              </a>
              <Link
                href="/powerpoint/addin"
                target="_blank"
                rel="noreferrer"
                className="btn-secondary border-slate-600 bg-slate-900/60 px-5 py-2.5 text-base text-white hover:bg-slate-800"
              >
                Add-in im Browser testen
              </Link>
            </div>

            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {[
                {
                  title: "1. Manifest laden",
                  body: "Laden Sie die XML-Datei ueber den Button oben herunter. Sie enthaelt bereits die korrekte Hosted-URL.",
                },
                {
                  title: "2. In PowerPoint einfuegen",
                  body: "PowerPoint > Einfuegen > Add-Ins > Eigene Add-Ins > Add-In hochladen. Dann die heruntergeladene XML auswaehlen.",
                },
                {
                  title: "3. Im Add-in anmelden",
                  body: "Nach dem Oeffnen des Taskpanes direkt mit Ihrem normalen Presenter-Account einloggen und die passende Session auswaehlen.",
                },
              ].map((step) => (
                <div
                  key={step.title}
                  className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur"
                >
                  <h2 className="text-lg font-semibold">{step.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{step.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 shadow-2xl shadow-slate-950/30">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-200">
              Wichtige Hinweise
            </p>

            <div className="mt-6 space-y-4 text-sm leading-6 text-slate-300">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                Fuer Einzelpersonen ist der schnellste Weg weiterhin der
                Manifest-Upload in PowerPoint. Ein echtes One-Click-Rollout fuer
                alle Nutzer gleichzeitig braucht Microsoft 365 Admin Deployment
                oder spaeter eine AppSource-Verteilung.
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                Das Add-in braucht keine manuell kopierten Presenter-Tokens mehr.
                Die Session-Auswahl passiert jetzt direkt im Taskpane nach dem
                Login.
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                Der Demo-Account bleibt absichtlich schreibgeschuetzt. Im Add-in
                koennen Demo-Nutzer deshalb keine Sessions steuern.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
