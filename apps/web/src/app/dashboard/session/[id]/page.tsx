"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Id } from "@convex/_generated/dataModel";
import { api } from "@convex/_generated/api";
import { SlideControls } from "@/components/dashboard/SlideControls";
import { QRCodeDialog } from "@/components/dashboard/QRCodeDialog";
import { Badge } from "@/components/ui/Badge";
import { useAuthStore } from "@/store/authStore";
import { convexClient } from "@/lib/convex";

const VIEWER_COUNT_POLL_INTERVAL = 10_000;

export default function SessionPage() {
  const params = useParams();
  const routeSessionId = typeof params.id === "string" ? params.id : null;
  const { token, isDemo } = useAuthStore();

  const data = useQuery(
    api.sessions.getPresenterSessionState,
    token && routeSessionId
      ? { token, sessionId: routeSessionId as Id<"presentationSessions"> }
      : "skip"
  );

  const startSession = useMutation(api.sessions.startSession);
  const stopSession = useMutation(api.sessions.stopSession);
  const triggerBlock = useMutation(api.sessions.triggerBlockManually);
  const unTriggerBlock = useMutation(api.sessions.unTriggerBlockManually);

  const [viewerCount, setViewerCount] = useState<number>(0);
  const [isViewerCountLoaded, setIsViewerCountLoaded] = useState(false);
  const activeSessionId = useMemo(() => data?.session._id, [data?.session._id]);
  const activeSessionStatus = useMemo(() => data?.session.status, [data?.session.status]);

  useEffect(() => {
    if (!token || !activeSessionId || activeSessionStatus !== "live") {
      setViewerCount(0);
      setIsViewerCountLoaded(false);
      return;
    }

    let isMounted = true;
    let isFetching = false;

    const fetchViewerCount = async () => {
      if (isFetching) return;
      isFetching = true;

      try {
        const count = await convexClient.query(api.viewers.getViewerCount, {
          token,
          sessionId: activeSessionId,
        });
        if (isMounted) {
          setViewerCount(count);
          setIsViewerCountLoaded(true);
        }
      } catch (error) {
        console.error("Failed to fetch viewer count", {
          sessionId: activeSessionId,
          error,
        });
        if (isMounted) {
          setViewerCount(0);
          setIsViewerCountLoaded(true);
        }
      } finally {
        isFetching = false;
      }
    };

    void fetchViewerCount();
    const interval = window.setInterval(() => {
      void fetchViewerCount();
    }, VIEWER_COUNT_POLL_INTERVAL);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [token, activeSessionId, activeSessionStatus]);

  const [isQROpen, setIsQROpen] = useState(false);
  const [activeView, setActiveView] = useState<"control" | "preview">("control");

  if (!data) {
    return <div className="section-panel text-center text-stone-500">Laedt Session...</div>;
  }

  const { session, handout, blocks } = data;
  const sessionId = session._id;
  const publicUrl = `/h/${session.publicToken}`;
  const fullPublicUrl =
    typeof window !== "undefined" ? `${window.location.origin}${publicUrl}` : publicUrl;

  const statusColor: Record<string, "green" | "yellow" | "gray"> = {
    live: "green",
    draft: "yellow",
    ended: "gray",
  };
  const statusLabel: Record<string, string> = {
    live: "Live",
    draft: "Entwurf",
    ended: "Beendet",
  };

  const visibleBlocks = blocks.filter((block) => block.isVisible);

  return (
    <div className="space-y-8">
      {isDemo && (
        <div className="soft-note">
          Demo-Modus: Session-Steuerung, Live-Freischaltungen und Add-in-Verbindung
          sind fuer den frei zugaenglichen Demo-Account deaktiviert.
        </div>
      )}

      <section className="page-hero">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-stone-500">
              <Link href="/dashboard" className="underline decoration-stone-300">
                Dashboard
              </Link>
              <span>/</span>
              {handout && (
                <>
                  <Link href={`/dashboard/handout/${session.handoutId}`} className="underline decoration-stone-300">
                    {handout.title}
                  </Link>
                  <span>/</span>
                </>
              )}
              <span>Session</span>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <h1 className="page-title m-0 text-5xl">{handout?.title ?? "Session"}</h1>
              <Badge variant={statusColor[session.status] ?? "gray"}>
                {statusLabel[session.status] ?? session.status}
              </Badge>
            </div>

            <p className="page-copy max-w-2xl">
              Steuern Sie Folienstand, manuelle Reveal-Blocks, QR-Zugang und
              PowerPoint-Anbindung von einer kompakten Session-Oberflaeche aus.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {session.status === "draft" && (
              <button
                className="btn-primary"
                onClick={() =>
                  token &&
                  startSession({ token, sessionId: sessionId as Id<"presentationSessions"> })
                }
                disabled={isDemo}
              >
                Session starten
              </button>
            )}
            {session.status === "live" && (
              <button
                className="btn-danger"
                onClick={() =>
                  confirm("Session beenden?") &&
                  token &&
                  stopSession({ token, sessionId: sessionId as Id<"presentationSessions"> })
                }
                disabled={isDemo}
              >
                Beenden
              </button>
            )}
            <button className="btn-secondary" onClick={() => setIsQROpen(true)}>
              QR-Code
            </button>
            <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary">
              Handout oeffnen
            </a>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="metric-card">
            <div className="metric-label">Oeffentlicher Link</div>
            <div className="mt-3 truncate text-sm font-semibold text-stone-900">{fullPublicUrl}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Zuschauer</div>
            <div className="metric-value">
              {session.status === "live" && isViewerCountLoaded ? viewerCount : 0}
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Sichtbare Blocks</div>
            <div className="metric-value">{visibleBlocks.length}</div>
          </div>
        </div>
      </section>

      <div className="segmented-shell">
        {(["control", "preview"] as const).map((view) => (
          <button
            key={view}
            className="segmented-button"
            data-active={activeView === view}
            onClick={() => setActiveView(view)}
          >
            {view === "control" ? "Steuerung" : "Vorschau"}
          </button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <section className="section-panel">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <div className="eyebrow">Session control</div>
                <h2 className="mt-3 text-4xl">Folien-Steuerung</h2>
              </div>
              {session.status === "live" && isViewerCountLoaded && (
                <div className="rounded-full border border-emerald-500/20 bg-emerald-50/90 px-3 py-2 text-sm text-emerald-800">
                  {viewerCount} Zuschauer aktiv
                </div>
              )}
            </div>
            <SlideControls
              sessionId={sessionId}
              currentSlide={session.currentSlide}
              totalSlides={session.totalSlides}
              syncMode={session.syncMode}
              disabled={isDemo}
            />
          </section>

          <section className="section-panel">
            <div className="eyebrow">PowerPoint</div>
            <h2 className="mt-3 text-4xl">Add-in und Live-Verbindung</h2>
            {isDemo ? (
              <p className="page-copy">
                Im Demo-Modus bleibt die Presenter-Steuerung im PowerPoint Add-in deaktiviert.
              </p>
            ) : (
              <>
                <p className="page-copy">
                  Das Add-in wird ueber dieselbe Web-App ausgeliefert. Nach der
                  Installation melden Sie sich im Taskpane an und waehlen dort
                  diese Session aus.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <a href="/powerpoint" className="btn-primary">
                    Install-Seite
                  </a>
                  <a href="/powerpoint/manifest" className="btn-secondary">
                    Manifest herunterladen
                  </a>
                </div>
              </>
            )}
          </section>

          <section className="section-panel">
            <div className="mb-5">
              <div className="eyebrow">Reveal-Status</div>
              <h2 className="mt-3 text-4xl">Bloecke im Ueberblick</h2>
            </div>
            <div className="space-y-3">
              {blocks.map((block) => (
                <div
                  key={block._id}
                  className={`rounded-[24px] border p-4 transition-colors ${
                    block.isVisible
                      ? "border-emerald-500/18 bg-emerald-50/70"
                      : "border-stone-900/8 bg-white/60"
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${block.isVisible ? "bg-emerald-500" : "bg-stone-300"}`} />
                        <h3 className="text-lg font-semibold text-stone-900">{block.title}</h3>
                      </div>
                      <p className="mt-2 text-sm text-stone-600">
                        {block.revealRule.alwaysVisible
                          ? "Immer sichtbar"
                          : block.revealRule.manuallyTriggered
                          ? "Manuelle Freigabe"
                          : `Ab Folie ${block.revealRule.revealSlide}`}
                      </p>
                    </div>

                    {block.revealRule.manuallyTriggered && (
                      <button
                        className={block.isVisible ? "btn-danger" : "btn-secondary"}
                        onClick={() =>
                          token &&
                          (block.isVisible
                            ? unTriggerBlock({
                                token,
                                sessionId: sessionId as Id<"presentationSessions">,
                                blockId: block._id,
                              })
                            : triggerBlock({
                                token,
                                sessionId: sessionId as Id<"presentationSessions">,
                                blockId: block._id,
                              }))
                        }
                        disabled={isDemo}
                      >
                        {block.isVisible ? "Sperren" : "Freischalten"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {activeView === "preview" && (
          <section className="section-panel">
            <div className="mb-5">
              <div className="eyebrow">Live reader</div>
              <h2 className="mt-3 text-4xl">Vorschau fuer Zuschauer</h2>
            </div>

            <div className="space-y-4">
              {visibleBlocks.length === 0 && (
                <div className="rounded-[24px] border border-dashed border-stone-900/12 bg-white/55 px-5 py-8 text-center text-sm text-stone-500">
                  Noch keine Inhalte freigeschaltet.
                </div>
              )}
              {visibleBlocks.map((block) => (
                <article key={block._id} className="rounded-[24px] border border-stone-900/8 bg-white/72 p-5">
                  <h3 className="text-2xl">{block.title}</h3>
                  <div className="markdown-content mt-4">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.content}</ReactMarkdown>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>

      <QRCodeDialog
        isOpen={isQROpen}
        onClose={() => setIsQROpen(false)}
        publicUrl={publicUrl}
        handoutTitle={handout?.title ?? "Handout"}
      />
    </div>
  );
}
