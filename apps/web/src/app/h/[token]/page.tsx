"use client";

import { useQuery, useMutation } from "convex/react";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { api } from "@convex/_generated/api";
import { handoutComponents } from "@/components/ui/HandoutComponents";
import { TerminalFlashContext } from "@/components/ui/Terminal";

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
  const [flashBlockIds, setFlashBlockIds] = useState<Set<string>>(new Set());
  const wasHiddenRef = useRef(false);

  // Track whether the tab was in the background; seed with actual initial state
  useEffect(() => {
    wasHiddenRef.current = document.hidden; // capture initial visibility state
    const onVisibility = () => { wasHiddenRef.current = document.hidden; };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

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

    // Scroll to the first new block
    setTimeout(() => {
      const el = document.querySelector(`[data-block-id="${[...freshIds][0]}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);

    // Flash terminals if the tab was hidden when the update came in
    let flashTimer: ReturnType<typeof setTimeout> | undefined;
    if (wasHiddenRef.current) {
      setFlashBlockIds(freshIds);
      flashTimer = setTimeout(() => setFlashBlockIds(new Set()), 3500);
    }

    const timer = setTimeout(() => setNewBlockIds(new Set()), 2000);
    return () => {
      clearTimeout(timer);
      if (flashTimer) clearTimeout(flashTimer);
    };
  }, [visibleBlocks]);

  const handlePrint = () => window.print();

  const handleDownloadPDF = () => {
    // Create a temporary title for the PDF filename
    const title = sessionInfo?.handoutTitle || "handout";
    document.title = title;
    window.print();
    // Restore title after print dialog
    setTimeout(() => { document.title = "Slide Handout"; }, 1000);
  };

  if (sessionInfo === undefined || visibleBlocks === undefined) {
    return (
      <div className="page-shell flex min-h-screen items-center justify-center py-10">
        <div className="section-panel text-center">
          <div className="eyebrow">Reader</div>
          <p className="mt-4 text-base" style={{ color: "var(--ink-soft)" }}>Lade Handout…</p>
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
    draft: { color: "border-amber-500/20 bg-amber-50/90 text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-300", label: "Noch nicht gestartet" },
    live: { color: "border-emerald-500/20 bg-emerald-50/90 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300", label: "Live" },
    ended: { color: "border-slate-500/15 bg-slate-100/80 text-slate-700 dark:border-slate-500/20 dark:bg-slate-800/40 dark:text-slate-300", label: "Beendet" },
  };

  const status = statusInfo[sessionInfo.status as keyof typeof statusInfo] ?? statusInfo.ended;

  const footerText =
    {
      live: "Live aktualisiert",
      draft: "Entwurf",
      ended: "Beendet",
    }[sessionInfo.status] ?? "Slide Handout";

  return (
    <div className="handout-reader pb-16 pt-6">
      <div className="page-shell">
        <header className="page-hero no-print">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="kicker-pill">Öffentlicher Reader</span>
              <h1 className="page-title mt-4 text-5xl">{sessionInfo.handoutTitle}</h1>
              {sessionInfo.handoutDescription && (
                <p className="page-copy max-w-2xl">{sessionInfo.handoutDescription}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <span className={`rounded-lg border px-4 py-2 text-sm font-semibold ${status.color}`}>
                {status.label}
              </span>
              <button onClick={handlePrint} className="btn-secondary">
                Drucken
              </button>
              {sessionInfo.pdfUrl ? (
                <a href={sessionInfo.pdfUrl} download className="btn-secondary">
                  PDF herunterladen
                </a>
              ) : (
                <button onClick={handleDownloadPDF} className="btn-secondary">
                  Als PDF speichern
                </button>
              )}
            </div>
          </div>

          {sessionInfo.status === "live" && (
            <div className="mt-6 inline-flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-50/80 px-4 py-2 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300">
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
            visibleBlocks.map((block, idx) => {
              const isNew = newBlockIds.has(block.id);
              const shouldFlash = flashBlockIds.has(block.id);

              const fontSizeClass = {
                sm: "text-sm",
                base: "text-base",
                lg: "text-lg",
                xl: "text-xl",
              }[block.fontSize ?? "base"] ?? "text-base";

              const layoutClass = {
                default: "",
                centered: "text-center mx-auto max-w-2xl",
                wide: "max-w-none",
                compact: "max-w-lg mx-auto",
              }[block.layout ?? "default"] ?? "";

              const blockImage = block.imageUrl ? (
                <figure className={`${block.imagePosition === "full-width" ? "w-full" : ""}`}>
                  <img
                    src={block.imageUrl}
                    alt={block.imageCaption || block.title}
                    className={`rounded-lg ${
                      block.imagePosition === "full-width" ? "w-full object-cover max-h-80" :
                      block.imagePosition === "background" ? "absolute inset-0 w-full h-full object-cover opacity-20 rounded-xl" :
                      "max-h-64 object-contain"
                    }`}
                  />
                  {block.imageCaption && (
                    <figcaption className="mt-2 text-center text-sm" style={{ color: "var(--ink-muted)" }}>
                      {block.imageCaption}
                    </figcaption>
                  )}
                </figure>
              ) : null;

              const contentSection = (
                <>
                  <div className="flex items-center gap-3 pt-5 px-0">
                    <span
                      className="block-number flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white"
                      style={{ background: "var(--accent)" }}
                    >
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <svg className="h-4 w-4" style={{ color: "var(--accent)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    <span className="eyebrow">Abschnitt</span>
                  </div>
                  <h2 className="mt-3 text-3xl font-bold sm:text-4xl">{block.title}</h2>
                  <div className={`markdown-content mt-5 ${fontSizeClass}`}>
                    <TerminalFlashContext.Provider value={shouldFlash}>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[
                          rehypeRaw,
                          // Sanitize HTML after rehype-raw to prevent stored XSS.
                          // Allow class attributes on div/span/p for grid-2/stat layouts.
                          [rehypeSanitize, {
                            ...defaultSchema,
                            attributes: {
                              ...defaultSchema.attributes,
                              div: [...(defaultSchema.attributes?.div ?? []), "className", "class"],
                              span: [...(defaultSchema.attributes?.span ?? []), "className", "class"],
                              p: [...(defaultSchema.attributes?.p ?? []), "className", "class"],
                            },
                          }],
                        ]}
                        components={handoutComponents}
                      >
                        {block.content}
                      </ReactMarkdown>
                    </TerminalFlashContext.Provider>
                  </div>
                </>
              );

              return (
                <article
                  key={block.id}
                  data-block-id={block.id}
                  className={`handout-block card overflow-hidden ${layoutClass} ${isNew ? "ring-2 ring-emerald-300 dark:ring-emerald-500" : ""} ${block.imagePosition === "background" ? "relative" : ""}`}
                >
                  <div className="h-1 w-full rounded-t-lg bg-gradient-to-r from-[#5BB8B8] to-[#E8998D]" />

                  {block.imagePosition === "background" && blockImage}

                  {block.imagePosition === "left" && blockImage ? (
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="md:w-1/3 flex-shrink-0">{blockImage}</div>
                      <div className="md:w-2/3">{contentSection}</div>
                    </div>
                  ) : block.imagePosition === "right" && blockImage ? (
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="md:w-2/3">{contentSection}</div>
                      <div className="md:w-1/3 flex-shrink-0">{blockImage}</div>
                    </div>
                  ) : (
                    <>
                      {(block.imagePosition === "above" || block.imagePosition === "full-width") && blockImage}
                      {contentSection}
                      {block.imagePosition === "below" && blockImage}
                    </>
                  )}
                </article>
              );
            })
          )}
        </main>

        <footer className="no-print flex items-center justify-center gap-2 pt-8 text-center text-xs uppercase tracking-widest" style={{ color: "var(--ink-muted)" }}>
          Slide Handout · {footerText}
          {sessionInfo.status === "live" && (
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
          )}
        </footer>
      </div>
    </div>
  );
}
