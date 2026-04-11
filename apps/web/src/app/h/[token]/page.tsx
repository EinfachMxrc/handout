"use client";

import { useQuery, useMutation } from "convex/react";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api } from "@convex/_generated/api";

function getViewerId(): string {
  const key = "slide-handout-viewer-id";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem(key, id);
  }
  return id;
}

export default function PublicHandoutPage() {
  const params = useParams();
  const publicToken = params.token as string;

  const sessionInfo = useQuery(api.sessions.getPublicSession, { publicToken });
  const visibleBlocks = useQuery(api.sessions.getVisibleBlocksForPublic, { publicToken });
  const pingViewer = useMutation(api.viewers.pingViewer);

  useEffect(() => {
    if (!sessionInfo || sessionInfo.status === "ended") return;
    const viewerId = getViewerId();
    const ping = () => pingViewer({ publicToken, viewerId }).catch(() => {});
    ping();
    const interval = setInterval(ping, 30_000);
    return () => clearInterval(interval);
  }, [publicToken, sessionInfo?.status, pingViewer]);

  const prevBlockIdsRef = useRef<Set<string>>(new Set());
  const [newBlockIds, setNewBlockIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!visibleBlocks) return;

    const currentIds = new Set(visibleBlocks.map((block) => block.id));
    const freshIds = new Set<string>();

    currentIds.forEach((id) => {
      if (!prevBlockIdsRef.current.has(id)) freshIds.add(id);
    });

    prevBlockIdsRef.current = currentIds;

    if (freshIds.size === 0) return;

    setNewBlockIds(freshIds);
    const timer = setTimeout(() => setNewBlockIds(new Set()), 2000);
    return () => clearTimeout(timer);
  }, [visibleBlocks]);

  const handlePrint = () => window.print();

  if (sessionInfo === undefined || visibleBlocks === undefined) {
    return (
      <div className="page-shell flex min-h-screen items-center justify-center py-10">
        <div className="section-panel text-center">
          <div className="eyebrow">Reader</div>
          <p className="mt-4 text-base text-stone-600">Lade Handout...</p>
        </div>
      </div>
    );
  }

  if (!sessionInfo) {
    return (
      <div className="page-shell flex min-h-screen items-center justify-center py-10">
        <div className="section-panel max-w-xl text-center">
          <div className="eyebrow">Nicht gefunden</div>
          <h1 className="mt-3 text-5xl">Handout nicht verfügbar</h1>
          <p className="page-copy mx-auto">
            Dieser Link ist ungültig oder die Session ist nicht mehr erreichbar.
          </p>
        </div>
      </div>
    );
  }

  const statusInfo = {
    draft: { color: "border-amber-500/20 bg-amber-50/90 text-amber-800", label: "Noch nicht gestartet" },
    live: { color: "border-emerald-500/20 bg-emerald-50/90 text-emerald-800", label: "Live" },
    ended: { color: "border-stone-500/15 bg-stone-100/80 text-stone-700", label: "Beendet" },
  };

  const status = statusInfo[sessionInfo.status as keyof typeof statusInfo] ?? statusInfo.ended;

  const footerText =
    {
      live: "Live aktualisiert",
      draft: "Entwurf",
      ended: "Beendet",
    }[sessionInfo.status] ?? "Slide Handout";

  return (
    <div className="pb-16 pt-6">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .handout-block { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      <div className="page-shell">
        <header className="page-hero no-print">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="kicker-pill">Public reader</span>
              <h1 className="page-title mt-4 text-5xl">{sessionInfo.handoutTitle}</h1>
              {sessionInfo.handoutDescription && (
                <p className="page-copy max-w-2xl">{sessionInfo.handoutDescription}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <span className={`rounded-full border px-4 py-2 text-sm font-semibold ${status.color}`}>
                {status.label}
              </span>
              <button onClick={handlePrint} className="btn-secondary">
                Drucken
              </button>
            </div>
          </div>

          {sessionInfo.status === "live" && (
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-50/80 px-4 py-2 text-sm text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Folie {sessionInfo.currentSlide}
              {sessionInfo.presentationTitle ? ` · ${sessionInfo.presentationTitle}` : ""}
            </div>
          )}
        </header>

        <main className="mx-auto mt-8 max-w-4xl space-y-5">
          {visibleBlocks.length === 0 ? (
            <div className="empty-state">
              <div className="eyebrow">Noch keine Freigabe</div>
              <h2 className="mt-3 text-4xl">Inhalte erscheinen während des Vortrags.</h2>
              <p className="page-copy mx-auto max-w-xl">
                {sessionInfo.status === "draft"
                  ? "Die Präsentation wurde noch nicht gestartet."
                  : "Sobald neue Abschnitte freigegeben werden, erscheinen sie hier im Reader."}
              </p>
            </div>
          ) : (
            visibleBlocks.map((block) => {
              const isNew = newBlockIds.has(block.id);
              return (
                <article
                  key={block.id}
                  className={`handout-block card ${isNew ? "ring-2 ring-emerald-200" : ""}`}
                >
                  <div className="eyebrow">Reader block</div>
                  <h2 className="mt-3 text-4xl">{block.title}</h2>
                  <div className="markdown-content mt-5 text-base">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.content}</ReactMarkdown>
                  </div>
                </article>
              );
            })
          )}
        </main>

        <footer className="no-print pt-8 text-center text-xs uppercase tracking-[0.18em] text-stone-500">
          Slide Handout · {footerText}
        </footer>
      </div>
    </div>
  );
}
