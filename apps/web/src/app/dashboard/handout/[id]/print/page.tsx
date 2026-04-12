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

  useEffect(() => {
    if (data) {
      const timer = setTimeout(() => window.print(), 300);
      return () => clearTimeout(timer);
    }
  }, [data]);

  const revealLabel = (rule: any): string => {
    if (rule.alwaysVisible) return "Immer sichtbar";
    if (rule.manuallyTriggered) return "Manuell";
    let label = `Ab Folie ${rule.revealSlide}`;
    if (rule.revealToSlide) label += `-${rule.revealToSlide}`;
    if (rule.relockOnBack) label += " (rücksperrend)";
    return label;
  };

  if (!data) {
    return <div className="p-8" style={{ color: "var(--ink-muted)" }}>Lädt…</div>;
  }

  const blocks = [...data.blocks].sort((a, b) => a.order - b.order);

  return (
    <div className="min-h-screen bg-white">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .handout-block { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      <div className="no-print border-b px-6 py-4" style={{ borderColor: "var(--line)", background: "var(--paper)" }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href={`/dashboard/handout/${handoutId}`} className="btn-secondary">
              Zurück
            </Link>
            <div>
              <div className="eyebrow">Druckansicht</div>
              <div className="text-sm" style={{ color: "var(--ink-soft)" }}>Alle Blöcke in Editor-Reihenfolge</div>
            </div>
          </div>
          <button onClick={() => window.print()} className="btn-primary">
            Drucken / Als PDF speichern
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-10">
        <header className="mb-8 border-b pb-6" style={{ borderColor: "var(--line)" }}>
          <h1 className="text-5xl">{data.title}</h1>
          {data.description && <p className="mt-3 max-w-2xl text-base" style={{ color: "var(--ink-soft)" }}>{data.description}</p>}
          <p className="mt-4 text-xs uppercase tracking-widest no-print" style={{ color: "var(--ink-muted)" }}>
            {blocks.length} Blöcke · Reveal-Regeln als Badge sichtbar
          </p>
        </header>

        <div className="space-y-8">
          {blocks.map((block, idx) => (
            <article key={block._id} className="handout-block">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="eyebrow no-print">Block {idx + 1}</span>
                <span className="rounded-lg border px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-widest" style={{ borderColor: "var(--line)", background: "var(--paper)", color: "var(--ink-soft)" }}>
                  {revealLabel(block.revealRule)}
                </span>
              </div>
              <h2 className="text-3xl">{block.title}</h2>
              <div className="markdown-content mt-4">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.content}</ReactMarkdown>
              </div>
              {idx < blocks.length - 1 && <hr className="mt-8" style={{ borderColor: "var(--line)" }} />}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
