"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { api } from "@convex/_generated/api";
import { useAuthStore } from "@/store/authStore";
import { BlockEditor } from "@/components/dashboard/BlockEditor";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import type { Id } from "@convex/_generated/dataModel";

const DRAG_TYPE = "HANDOUT_BLOCK";

interface DraggableBlockProps {
  block: {
    _id: string;
    title: string;
    content: string;
    order: number;
    revealRule: {
      revealSlide: number;
      revealToSlide?: number;
      relockOnBack?: boolean;
      alwaysVisible?: boolean;
      manuallyTriggered?: boolean;
    };
  };
  index: number;
  totalBlocks: number;
  revealRuleLabel: (rule: any) => string;
  onMoveBlock: (id: string, dir: "up" | "down") => void;
  onDrop: (dragIndex: number, hoverIndex: number) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  isReadonly: boolean;
}

function DraggableBlock({
  block,
  index,
  totalBlocks,
  revealRuleLabel,
  onMoveBlock,
  onDrop,
  onEdit,
  onDelete,
  isReadonly,
}: DraggableBlockProps) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag, dragPreview] = useDrag({
    type: DRAG_TYPE,
    item: { index },
    canDrag: !isReadonly,
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const [{ isOver }, drop] = useDrop<{ index: number }, void, { isOver: boolean }>({
    accept: DRAG_TYPE,
    collect: (monitor) => ({ isOver: monitor.isOver() }),
    hover(item) {
      if (isReadonly) return;
      if (item.index === index) return;
      onDrop(item.index, index);
      item.index = index;
    },
  });

  drop(dragPreview(ref));

  return (
    <div
      ref={ref}
      className={`card transition-all duration-200 ${isDragging ? "scale-[0.99] opacity-50" : ""} ${isOver ? "ring-2 ring-indigo-300 dark:ring-indigo-500" : ""}`}
    >
      <div className="flex items-start gap-4">
        <div
          ref={drag as any}
          className={`mt-1 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-xl ${
            isReadonly ? "cursor-not-allowed opacity-40" : "cursor-grab active:cursor-grabbing"
          }`}
          style={{ border: "1px solid var(--line)", background: "var(--paper)" }}
          title="Ziehen zum Sortieren"
        >
          ::
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <button
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg transition disabled:opacity-30"
            style={{ border: "1px solid var(--line)", background: "var(--paper)", color: "var(--ink-muted)" }}
            onClick={() => onMoveBlock(block._id, "up")}
            disabled={isReadonly || index === 0}
            title="Nach oben"
            aria-label="Block nach oben verschieben"
          >
            ^
          </button>
          <button
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg transition disabled:opacity-30"
            style={{ border: "1px solid var(--line)", background: "var(--paper)", color: "var(--ink-muted)" }}
            onClick={() => onMoveBlock(block._id, "down")}
            disabled={isReadonly || index === totalBlocks - 1}
            title="Nach unten"
            aria-label="Block nach unten verschieben"
          >
            v
          </button>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="eyebrow">Block {index + 1}</span>
            <Badge variant="blue">{revealRuleLabel(block.revealRule)}</Badge>
          </div>
          <h3 className="mt-3 text-3xl leading-tight">{block.title}</h3>
          <p className="mt-3 line-clamp-3 text-sm leading-7" style={{ color: "var(--ink-soft)" }}>{block.content}</p>
        </div>

        <div className="flex flex-col gap-2">
          <button className="btn-secondary" onClick={() => onEdit(block._id)} disabled={isReadonly}>
            Bearbeiten
          </button>
          <button className="btn-danger" onClick={() => onDelete(block._id)} disabled={isReadonly}>
            Löschen
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HandoutEditPage() {
  const params = useParams();
  const handoutId = params.id as string;
  const { token, isDemo } = useAuthStore();
  const router = useRouter();

  const data = useQuery(
    api.handouts.getHandoutWithBlocks,
    token ? { token, handoutId: handoutId as Id<"handouts"> } : "skip"
  );
  const deleteBlock = useMutation(api.handouts.deleteBlock);
  const reorderBlocks = useMutation(api.handouts.reorderBlocks);
  const createSession = useMutation(api.sessions.createSession);
  const updateHandout = useMutation(api.handouts.updateHandout);
  const generateUploadUrl = useMutation(api.handouts.generateUploadUrl);
  const setPdfFile = useMutation(api.handouts.setPdfFile);
  const removePdfFile = useMutation(api.handouts.removePdfFile);

  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [isCreatingBlock, setIsCreatingBlock] = useState(false);
  const [isEditingHandout, setIsEditingHandout] = useState(false);
  const [handoutTitle, setHandoutTitle] = useState("");
  const [handoutDesc, setHandoutDesc] = useState("");
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);

  const openEditHandout = () => {
    if (!data) return;
    setHandoutTitle(data.title);
    setHandoutDesc(data.description ?? "");
    setIsEditingHandout(true);
  };

  const handleSaveHandout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || isDemo) return;
    await updateHandout({
      token,
      handoutId: handoutId as Id<"handouts">,
      title: handoutTitle,
      description: handoutDesc || undefined,
    });
    setIsEditingHandout(false);
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token || isDemo) return;
    setIsUploadingPdf(true);
    try {
      const uploadUrl = await generateUploadUrl({ token });
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();
      await setPdfFile({ token, handoutId: handoutId as Id<"handouts">, pdfFileId: storageId });
    } finally {
      setIsUploadingPdf(false);
      e.target.value = "";
    }
  };

  const handleRemovePdf = async () => {
    if (!token || isDemo) return;
    await removePdfFile({ token, handoutId: handoutId as Id<"handouts"> });
  };

  const handleStartSession = async () => {
    if (!token || isDemo) return;
    const sessionId = await createSession({ token, handoutId: handoutId as Id<"handouts"> });
    router.push(`/dashboard/session/${sessionId}`);
  };

  const handleMoveBlock = async (blockId: string, direction: "up" | "down") => {
    if (!data || !token || isDemo) return;
    const sorted = [...data.blocks].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((b) => b._id === blockId);
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === sorted.length - 1) return;

    const newBlocks = [...sorted];
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    [newBlocks[idx], newBlocks[swapIdx]] = [newBlocks[swapIdx], newBlocks[idx]];

    await reorderBlocks({
      token,
      handoutId: handoutId as Id<"handouts">,
      blockIds: newBlocks.map((b) => b._id as Id<"handoutBlocks">),
    });
  };

  const handleDrop = async (dragIndex: number, hoverIndex: number) => {
    if (!data || !token || isDemo) return;
    const sorted = [...data.blocks].sort((a, b) => a.order - b.order);
    const newBlocks = [...sorted];
    const [moved] = newBlocks.splice(dragIndex, 1);
    newBlocks.splice(hoverIndex, 0, moved);

    await reorderBlocks({
      token,
      handoutId: handoutId as Id<"handouts">,
      blockIds: newBlocks.map((b) => b._id as Id<"handoutBlocks">),
    });
  };

  if (!data) {
    return <div className="section-panel text-center" style={{ color: "var(--ink-muted)" }}>Lädt Handout…</div>;
  }

  const blocks = [...data.blocks].sort((a, b) => a.order - b.order);

  const revealRuleLabel = (rule: any) => {
    if (rule.alwaysVisible) return "Immer sichtbar";
    if (rule.manuallyTriggered) return "Manuell";
    let label = `Ab Folie ${rule.revealSlide}`;
    if (rule.revealToSlide) label += ` bis ${rule.revealToSlide}`;
    if (rule.relockOnBack) label += " (rücksperrend)";
    return label;
  };

  return (
    <div className="space-y-8">
      {isDemo && (
        <div className="soft-note">
          Demo-Modus: Dieses Handout ist nur lesbar. Bearbeiten, Blöcke
          anlegen oder Sessions starten ist für Demo-Nutzer gesperrt.
        </div>
      )}

      <section className="page-hero">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-sm" style={{ color: "var(--ink-muted)" }}>
              <Link href="/dashboard" className="underline" style={{ textDecorationColor: "var(--accent)" }}>
                Dashboard
              </Link>
              <span>/</span>
              <span>{data.title}</span>
            </div>
            <h1 className="page-title mt-4 text-5xl">{data.title}</h1>
            {data.description && <p className="page-copy max-w-2xl">{data.description}</p>}
          </div>

          <div className="flex flex-wrap gap-3">
            <button className="btn-secondary" onClick={openEditHandout} disabled={isDemo}>
              Handout bearbeiten
            </button>
            <Link href={`/dashboard/handout/${handoutId}/print`} target="_blank" className="btn-secondary">
              Exportieren
            </Link>
            <button className="btn-primary" onClick={handleStartSession} disabled={isDemo}>
              Session starten
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="metric-card">
            <div className="metric-label">Blöcke</div>
            <div className="metric-value">{blocks.length}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Reveal-System</div>
            <div className="mt-3 text-lg font-semibold">Slide-basiert</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Modus</div>
            <div className="mt-3 text-lg font-semibold">
              {isDemo ? "Demo (read-only)" : "Vollzugriff"}
            </div>
          </div>
        </div>
      </section>

      <section className="section-panel">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <div className="eyebrow">Inhaltsblöcke</div>
            <h2 className="mt-3 text-4xl">Struktur und Reveal-Regeln</h2>
          </div>
          <button className="btn-primary" onClick={() => setIsCreatingBlock(true)} disabled={isDemo}>
            Block hinzufügen
          </button>
        </div>

        <DndProvider backend={HTML5Backend}>
          <div className="space-y-4">
            {blocks.length === 0 ? (
              <div className="empty-state">
                <div className="eyebrow">Noch kein Inhalt</div>
                <h3 className="mt-3 text-4xl">Beginnen Sie mit dem ersten Block.</h3>
                <p className="page-copy mx-auto max-w-xl">
                  Jeder Block kann auf einer bestimmten Folie erscheinen, wieder
                  verschwinden oder manuell freigegeben werden.
                </p>
              </div>
            ) : (
              blocks.map((block, idx) => (
                <DraggableBlock
                  key={block._id}
                  block={block}
                  index={idx}
                  totalBlocks={blocks.length}
                  revealRuleLabel={revealRuleLabel}
                  onMoveBlock={handleMoveBlock}
                  onDrop={handleDrop}
                  isReadonly={isDemo}
                  onEdit={(id) => setEditingBlockId(id)}
                  onDelete={(id) => {
                    if (confirm("Block löschen?") && token) {
                      deleteBlock({ token, blockId: id as Id<"handoutBlocks"> });
                    }
                  }}
                />
              ))
            )}
          </div>
        </DndProvider>
      </section>

      <section className="section-panel">
        <div className="card p-5 space-y-3">
          <h3 className="text-lg font-semibold">Voreingestellte PDF</h3>
          <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
            Lade eine fertige PDF hoch, die deine Zuhoerer direkt herunterladen koennen.
          </p>
          {data.pdfFileId ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-emerald-600">PDF hochgeladen</span>
              <button onClick={handleRemovePdf} className="btn-danger text-xs px-3 py-1.5" disabled={isDemo}>
                Entfernen
              </button>
            </div>
          ) : (
            <label className={`btn-secondary cursor-pointer inline-block ${isUploadingPdf ? "opacity-50 pointer-events-none" : ""}`}>
              {isUploadingPdf ? "Wird hochgeladen…" : "PDF hochladen"}
              <input type="file" accept=".pdf" className="hidden" onChange={handlePdfUpload} disabled={isDemo || isUploadingPdf} />
            </label>
          )}
        </div>
      </section>

      <Modal isOpen={isCreatingBlock} onClose={() => setIsCreatingBlock(false)} title="Neuer Block" size="lg">
        <BlockEditor
          handoutId={handoutId}
          onSave={() => setIsCreatingBlock(false)}
          onCancel={() => setIsCreatingBlock(false)}
        />
      </Modal>

      <Modal isOpen={!!editingBlockId} onClose={() => setEditingBlockId(null)} title="Block bearbeiten" size="lg">
        {editingBlockId && (
          <BlockEditor
            handoutId={handoutId}
            block={blocks.find((b) => b._id === editingBlockId)}
            onSave={() => setEditingBlockId(null)}
            onCancel={() => setEditingBlockId(null)}
          />
        )}
      </Modal>

      <Modal isOpen={isEditingHandout} onClose={() => setIsEditingHandout(false)} title="Handout bearbeiten">
        <form onSubmit={handleSaveHandout} className="space-y-4">
          <div>
            <label className="label">Titel</label>
            <input className="input" value={handoutTitle} onChange={(e) => setHandoutTitle(e.target.value)} required />
          </div>
          <div>
            <label className="label">Beschreibung</label>
            <textarea className="textarea" value={handoutDesc} onChange={(e) => setHandoutDesc(e.target.value)} rows={3} />
          </div>
          <div className="flex gap-3">
            <button type="submit" className="btn-primary flex-1" disabled={isDemo}>
              Speichern
            </button>
            <button type="button" className="btn-secondary" onClick={() => setIsEditingHandout(false)}>
              Abbrechen
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
