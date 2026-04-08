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
    return <div className="text-center py-12 text-gray-500">Lädt Session...</div>;
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

  return (
    <div>
      {isDemo && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Demo-Modus: Session-Steuerung, Live-Freischaltungen und Add-in-Verbindung sind für den frei zugänglichen Demo-Account deaktiviert.
        </div>
      )}

      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/dashboard" className="hover:text-gray-700">Dashboard</Link>
        <span>/</span>
        {handout && (
          <>
            <Link
              href={`/dashboard/handout/${session.handoutId}`}
              className="hover:text-gray-700"
            >
              {handout.title}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-gray-900">Session</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900">
            {handout?.title ?? "Session"}
          </h1>
          <Badge variant={statusColor[session.status] ?? "gray"}>
            {statusLabel[session.status] ?? session.status}
          </Badge>
          {session.status === "live" && isViewerCountLoaded && (
            <span className="text-sm text-gray-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
              {viewerCount} {viewerCount === 1 ? "Zuschauer" : "Zuschauer"}
            </span>
          )}
        </div>

        <div className="flex gap-2">
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
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
          >
            Handout öffnen ↗
          </a>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6 flex items-center gap-3">
        <span className="text-blue-700 text-sm font-medium">Öffentlicher Link:</span>
        <code className="text-blue-900 text-sm flex-1 truncate">{fullPublicUrl}</code>
        <button
          className="text-blue-600 text-sm hover:underline flex-shrink-0"
          onClick={() => navigator.clipboard.writeText(fullPublicUrl)}
        >
          Kopieren
        </button>
      </div>

      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit">
        {(["control", "preview"] as const).map((view) => (
          <button
            key={view}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeView === view
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
            onClick={() => setActiveView(view)}
          >
            {view === "control" ? "Steuerung" : "Vorschau"}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Folien-Steuerung</h2>
            <SlideControls
              sessionId={sessionId}
              currentSlide={session.currentSlide}
              totalSlides={session.totalSlides}
              syncMode={session.syncMode}
              disabled={isDemo}
            />
          </div>

          <div className="card">
            {isDemo ? (
              <div className="text-sm text-gray-500">
                Im Demo-Modus bleibt die Presenter-Steuerung im PowerPoint Add-in deaktiviert.
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h2 className="font-semibold text-gray-900">PowerPoint Add-in</h2>
                  <p className="mt-2 text-sm text-gray-600">
                    Das Add-in wird jetzt über Ihre Vercel-Domain ausgeliefert.
                    Nach der Installation melden Sie sich direkt im Taskpane mit
                    Ihrem normalen Account an und wählen dort diese Session aus.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <a href="/powerpoint" className="btn-primary justify-center">
                    Install-Seite öffnen
                  </a>
                  <a href="/powerpoint/manifest" className="btn-secondary justify-center">
                    Manifest herunterladen
                  </a>
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  Schnellweg:{" "}
                  <span className="font-medium text-gray-900">
                    PowerPoint &gt; Einfügen &gt; Add-Ins &gt; Eigene Add-Ins &gt; Add-In hochladen
                  </span>
                  <span className="block mt-1">
                    Danach das Taskpane öffnen, einloggen und die gewünschte Session auswählen.
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-3">Blöcke</h2>
            <div className="space-y-2">
              {blocks.map((block) => (
                <div
                  key={block._id}
                  className={`flex items-center justify-between p-2 rounded-lg border ${
                    block.isVisible
                      ? "border-green-200 bg-green-50"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${block.isVisible ? "bg-green-500" : "bg-gray-300"}`} />
                    <span className="text-sm text-gray-900 truncate">{block.title}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!block.isVisible && (
                      <span className="text-xs text-gray-500">
                        Ab Folie {block.revealRule.alwaysVisible ? "–" : block.revealRule.revealSlide}
                      </span>
                    )}
                    {block.revealRule.manuallyTriggered && (
                      <button
                        className={`text-xs px-2 py-1 rounded ${
                          block.isVisible
                            ? "bg-red-100 text-red-700 hover:bg-red-200"
                            : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                        }`}
                        onClick={() =>
                          token &&
                          (block.isVisible
                            ? unTriggerBlock({ token, sessionId: sessionId as Id<"presentationSessions">, blockId: block._id })
                            : triggerBlock({ token, sessionId: sessionId as Id<"presentationSessions">, blockId: block._id }))
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
          </div>
        </div>

        {activeView === "preview" && (
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">
              Live-Vorschau
              <span className="text-xs font-normal text-gray-500 ml-2">
                (wie Zuschauer sehen)
              </span>
            </h2>
            <div className="space-y-4 max-h-[500px] overflow-y-auto">
              {blocks.filter((block) => block.isVisible).length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  Noch keine Inhalte freigeschaltet.
                </p>
              )}
              {blocks
                .filter((block) => block.isVisible)
                .map((block) => (
                  <div key={block._id} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">{block.title}</h3>
                    <div className="prose prose-sm max-w-none markdown-content">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {block.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                ))}
            </div>
          </div>
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
