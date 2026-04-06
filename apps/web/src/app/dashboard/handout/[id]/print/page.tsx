"use client";

import { useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api } from "@convex/_generated/api";
import { useAuthStore } from "@/store/authStore";
import type { Id } from "@convex/_generated/dataModel";

export default function HandoutPrintPage() {
  const params = useParams();
  const handoutId = params.id as string;
  const { token } = useAuthStore();

  const data = useQuery(
    api.handouts.getHandoutWithBlocks,
    token ? { token, handoutId: handoutId as Id<"handouts"> } : "skip"
  );

  // Print-Dialog automatisch öffnen wenn Daten geladen
  useEffect(() => {
    if (data) {
      const timer = setTimeout(() => window.print(), 300);
      return () => clearTimeout(timer);
    }
  }, [!!data]);

  const revealLabel = (rule: any): string => {
    if (rule.alwaysVisible) return "Immer sichtbar";
    if (rule.manuallyTriggered) return "Manuell";
    let label = `Ab Folie ${rule.revealSlide}`;
    if (rule.revealToSlide) label += `–${rule.revealToSlide}`;
    if (rule.relockOnBack) label += " ↩";
    return label;
  };

  if (!data) {
    return <div className="p-8 text-gray-500">Lädt...</div>;
  }

  const blocks = [...data.blocks].sort((a, b) => a.order - b.order);

  return (
    <div className="min-h-screen bg-white">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { font-size: 11pt; }
          .handout-block { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      {/* Toolbar – wird nicht gedruckt */}
      <div className="no-print sticky top-0 bg-gray-50 border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/handout/${handoutId}`}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Zurück
          </Link>
          <span className="text-gray-300">|</span>
          <span className="text-sm font-medium text-gray-700">Druckvorschau – alle Blöcke</span>
        </div>
        <button
          onClick={() => window.print()}
          className="btn-primary text-sm"
        >
          Drucken / Als PDF speichern
        </button>
      </div>

      {/* Druckinhalt */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="mb-8 pb-4 border-b border-gray-300">
          <h1 className="text-2xl font-bold text-gray-900">{data.title}</h1>
          {data.description && (
            <p className="text-gray-600 mt-1">{data.description}</p>
          )}
          <p className="text-xs text-gray-400 mt-2 no-print">
            {blocks.length} Blöcke · Reveal-Regeln sind als Badge sichtbar · Reihenfolge wie im Editor
          </p>
        </div>

        <div className="space-y-6">
          {blocks.map((block, idx) => (
            <div key={block._id} className="handout-block">
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-xs text-gray-400 no-print">#{idx + 1}</span>
                <h2 className="text-base font-semibold text-gray-900">{block.title}</h2>
                <span className="no-print text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded px-1.5 py-0.5">
                  {revealLabel(block.revealRule)}
                </span>
              </div>
              <div className="prose prose-sm max-w-none markdown-content text-gray-700">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.content}</ReactMarkdown>
              </div>
              {idx < blocks.length - 1 && (
                <hr className="mt-6 border-gray-200" />
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 pt-4 border-t border-gray-200 text-xs text-gray-400 no-print">
          Slide Handout · {new Date().toLocaleDateString("de-DE")}
        </div>
      </div>
    </div>
  );
}
