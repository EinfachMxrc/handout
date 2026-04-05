"use client";

import { useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api } from "../../../../convex/_generated/api";

export default function PublicHandoutPage() {
  const params = useParams();
  const publicToken = params.token as string;

  // Both queries are realtime via Convex subscriptions
  const sessionInfo = useQuery(api.sessions.getPublicSession, { publicToken });
  const visibleBlocks = useQuery(api.sessions.getVisibleBlocksForPublic, { publicToken });

  const [prevBlockIds, setPrevBlockIds] = useState<Set<string>>(new Set());
  const [newBlockIds, setNewBlockIds] = useState<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);

  // Track newly revealed blocks for animation
  useEffect(() => {
    if (!visibleBlocks) return;

    const currentIds = new Set(visibleBlocks.map((b) => b.id));
    const freshIds = new Set<string>();

    currentIds.forEach((id) => {
      if (!prevBlockIds.has(id)) {
        freshIds.add(id);
      }
    });

    if (freshIds.size > 0) {
      setNewBlockIds(freshIds);
      // Clear animation markers after 2s
      setTimeout(() => setNewBlockIds(new Set()), 2000);
    }

    setPrevBlockIds(currentIds);
  }, [visibleBlocks]);

  // Handle print
  const handlePrint = () => window.print();

  if (sessionInfo === undefined || visibleBlocks === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Lade Handout...</p>
        </div>
      </div>
    );
  }

  if (!sessionInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-6">
          <span className="text-4xl mb-4 block">🔍</span>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Handout nicht gefunden</h1>
          <p className="text-gray-600">
            Dieser Link ist ungültig oder die Session wurde beendet.
          </p>
        </div>
      </div>
    );
  }

  const statusInfo = {
    draft: { color: "bg-yellow-100 text-yellow-800", label: "Noch nicht gestartet" },
    live: { color: "bg-green-100 text-green-800", label: "Live" },
    ended: { color: "bg-gray-100 text-gray-700", label: "Beendet" },
  };

  const status = statusInfo[sessionInfo.status as keyof typeof statusInfo] ?? statusInfo.ended;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .handout-block { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 no-print">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                {sessionInfo.handoutTitle}
              </h1>
              {sessionInfo.handoutDescription && (
                <p className="text-sm text-gray-500">{sessionInfo.handoutDescription}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${status.color}`}>
                {status.label}
              </span>
              <button
                onClick={handlePrint}
                className="text-xs text-gray-500 hover:text-gray-700 border border-gray-300 px-3 py-1 rounded-lg transition-colors"
              >
                Drucken
              </button>
            </div>
          </div>

          {sessionInfo.status === "live" && (
            <div className="flex items-center gap-2 mt-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-gray-500">
                Folie {sessionInfo.currentSlide}
                {sessionInfo.presentationTitle && ` · ${sessionInfo.presentationTitle}`}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        {visibleBlocks.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-4xl mb-4 block">⏳</span>
            <h2 className="text-lg font-medium text-gray-900 mb-2">
              Noch keine Inhalte freigegeben
            </h2>
            <p className="text-gray-600 text-sm">
              {sessionInfo.status === "draft"
                ? "Die Präsentation wurde noch nicht gestartet."
                : "Inhalte werden im Verlauf der Präsentation freigeschaltet."}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {visibleBlocks.map((block, idx) => {
              const isNew = newBlockIds.has(block.id);
              return (
                <div
                  key={block.id}
                  className={`handout-block bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${
                    isNew ? "animate-slide-down ring-2 ring-blue-200" : ""
                  }`}
                >
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">
                    {block.title}
                  </h2>
                  <div className="markdown-content text-gray-700">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {block.content}
                    </ReactMarkdown>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div ref={bottomRef} className="h-16" />
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-gray-400 no-print">
        Slide Handout · Live aktualisiert
      </footer>
    </div>
  );
}
