"use client";

import { useState } from "react";
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

export default function SessionPage() {
  const params = useParams();
  const sessionId = params.id as string;
  const { token, isDemo } = useAuthStore();

  const data = useQuery(
    api.sessions.getPresenterSessionState,
    token ? { token, sessionId: sessionId as Id<"presentationSessions"> } : "skip"
  );

  const startSession = useMutation(api.sessions.startSession);
  const stopSession = useMutation(api.sessions.stopSession);
  const triggerBlock = useMutation(api.sessions.triggerBlockManually);
  const unTriggerBlock = useMutation(api.sessions.unTriggerBlockManually);

  const viewerCount = useQuery(
    api.viewers.getViewerCount,
    token && data ? { token, sessionId: sessionId as Id<"presentationSessions"> } : "skip"
  );

  const [isQROpen, setIsQROpen] = useState(false);
  const [activeView, setActiveView] = useState<"control" | "preview">("control");

  if (!data) {
    return <div className="py-12 text-center text-gray-500">Laedt Session...</div>;
  }

  const { session, handout, blocks } = data;
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
          Demo-Modus: Session-Steuerung, Live-Freischaltungen und die Add-in-Verbindung
          bleiben fuer den frei zugaenglichen Demo-Account deaktiviert.
        </div>
      )}

      <div className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard" className="hover:text-gray-700">
          Dashboard
        </Link>
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

      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900">
            {handout?.title ?? "Session"}
          </h1>
          <Badge variant={statusColor[session.status] ?? "gray"}>
            {statusLabel[session.status] ?? session.status}
          </Badge>
          {session.status === "live" && viewerCount !== undefined && (
            <span className="flex items-center gap-1 text-sm text-gray-500">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400" />
              {viewerCount} Zuschauer
            </span>
          )}
        </div>

        <div className="flex gap-2">
          {session.status === "draft" && (
            <button
              className="btn-primary"
              onClick={() =>
                token &&
                startSession({
                  token,
                  sessionId: sessionId as Id<"presentationSessions">,
                })
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
                stopSession({
                  token,
                  sessionId: sessionId as Id<"presentationSessions">,
                })
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
            Handout oeffnen
          </a>
        </div>
      </div>

      <div className="mb-6 flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
        <span className="text-sm font-medium text-blue-700">Oeffentlicher Link:</span>
        <code className="flex-1 truncate text-sm text-blue-900">{fullPublicUrl}</code>
        <button
          className="flex-shrink-0 text-sm text-blue-600 hover:underline"
          onClick={() => navigator.clipboard.writeText(fullPublicUrl)}
        >
          Kopieren
        </button>
      </div>

      <div className="mb-4 flex w-fit gap-1 rounded-lg bg-gray-100 p-1">
        {(["control", "preview"] as const).map((view) => (
          <button
            key={view}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
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

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="card">
            <h2 className="mb-4 font-semibold text-gray-900">Folien-Steuerung</h2>
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
                    Das Add-in wird jetzt ueber Ihre Vercel-Domain ausgeliefert.
                    Nach der Installation melden Sie sich direkt im Taskpane mit
                    Ihrem normalen Account an und waehlen dort diese Session aus.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <a href="/powerpoint" className="btn-primary justify-center">
                    Install-Seite oeffnen
                  </a>
                  <a href="/powerpoint/manifest" className="btn-secondary justify-center">
                    Manifest herunterladen
                  </a>
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  Schnellweg:{" "}
                  <span className="font-medium text-gray-900">
                    PowerPoint &gt; Einfuegen &gt; Add-Ins &gt; Eigene Add-Ins &gt; Add-In hochladen
                  </span>
                  <span className="mt-1 block">
                    Danach das Taskpane oeffnen, einloggen und die gewuenschte Session auswaehlen.
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="mb-3 font-semibold text-gray-900">Bloecke</h2>
            <div className="space-y-2">
              {blocks.map((block) => (
                <div
                  key={block._id}
                  className={`flex items-center justify-between rounded-lg border p-2 ${
                    block.isVisible
                      ? "border-green-200 bg-green-50"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={`h-2 w-2 flex-shrink-0 rounded-full ${
                        block.isVisible ? "bg-green-500" : "bg-gray-300"
                      }`}
                    />
                    <span className="truncate text-sm text-gray-900">{block.title}</span>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    {!block.isVisible && (
                      <span className="text-xs text-gray-500">
                        Ab Folie{" "}
                        {block.revealRule.alwaysVisible ? "-" : block.revealRule.revealSlide}
                      </span>
                    )}
                    {block.revealRule.manuallyTriggered && (
                      <button
                        className={`rounded px-2 py-1 text-xs ${
                          block.isVisible
                            ? "bg-red-100 text-red-700 hover:bg-red-200"
                            : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                        }`}
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
          </div>
        </div>

        {activeView === "preview" && (
          <div className="card">
            <h2 className="mb-4 font-semibold text-gray-900">
              Live-Vorschau
              <span className="ml-2 text-xs font-normal text-gray-500">
                (wie Zuschauer sehen)
              </span>
            </h2>
            <div className="max-h-[500px] space-y-4 overflow-y-auto">
              {blocks.filter((block) => block.isVisible).length === 0 && (
                <p className="py-4 text-center text-sm text-gray-500">
                  Noch keine Inhalte freigeschaltet.
                </p>
              )}
              {blocks
                .filter((block) => block.isVisible)
                .map((block) => (
                  <div key={block._id} className="rounded-lg border border-gray-200 p-4">
                    <h3 className="mb-2 font-semibold text-gray-900">{block.title}</h3>
                    <div className="markdown-content prose prose-sm max-w-none">
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
