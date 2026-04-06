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
      className={`card transition-all ${isDragging ? "opacity-40" : ""} ${isOver ? "ring-2 ring-blue-300" : ""}`}
    >
      <div className="flex items-start gap-3">
        {/* Drag handle */}
        <div
          ref={drag as any}
          className={`flex flex-col gap-0.5 flex-shrink-0 mt-2 touch-none ${
            isReadonly ? "cursor-not-allowed opacity-40" : "cursor-grab active:cursor-grabbing"
          }`}
          title="Ziehen zum Sortieren"
        >
          <span className="text-gray-300 leading-none select-none">⠿</span>
        </div>

        {/* Arrow controls */}
        <div className="flex flex-col gap-1 flex-shrink-0 mt-1">
          <button
            className="w-6 h-6 text-gray-400 hover:text-gray-600 flex items-center justify-center disabled:opacity-30"
            onClick={() => onMoveBlock(block._id, "up")}
            disabled={isReadonly || index === 0}
            title="Nach oben"
          >
            ↑
          </button>
          <button
            className="w-6 h-6 text-gray-400 hover:text-gray-600 flex items-center justify-center disabled:opacity-30"
            onClick={() => onMoveBlock(block._id, "down")}
            disabled={isReadonly || index === totalBlocks - 1}
            title="Nach unten"
          >
            ↓
          </button>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-gray-400">#{index + 1}</span>
            <h3 className="font-semibold text-gray-900 truncate">{block.title}</h3>
            <Badge variant="blue">{revealRuleLabel(block.revealRule)}</Badge>
          </div>
          <p className="text-sm text-gray-600 line-clamp-2">{block.content}</p>
        </div>

        <div className="flex gap-2 flex-shrink-0">
          <button className="btn-secondary text-xs" onClick={() => onEdit(block._id)} disabled={isReadonly}>
            Bearbeiten
          </button>
          <button className="btn-danger text-xs" onClick={() => onDelete(block._id)} disabled={isReadonly}>
            ×
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

  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [isCreatingBlock, setIsCreatingBlock] = useState(false);
  const [isEditingHandout, setIsEditingHandout] = useState(false);
  const [handoutTitle, setHandoutTitle] = useState("");
  const [handoutDesc, setHandoutDesc] = useState("");

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
    return (
      <div className="text-center py-12 text-gray-500">Lädt...</div>
    );
  }

  const blocks = [...data.blocks].sort((a, b) => a.order - b.order);

  const revealRuleLabel = (rule: any) => {
    if (rule.alwaysVisible) return "Immer sichtbar";
    if (rule.manuallyTriggered) return "Manuell";
    let label = `Ab Folie ${rule.revealSlide}`;
    if (rule.revealToSlide) label += ` bis ${rule.revealToSlide}`;
    if (rule.relockOnBack) label += " (zurücksperrend)";
    return label;
  };

  return (
    <div className="max-w-4xl">
      {isDemo && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Dieses Handout ist im Demo-Account nur lesbar. Bearbeiten, Blocks anlegen oder Sessions starten ist fuer alle Demo-Nutzer gesperrt.
        </div>
      )}
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/dashboard" className="hover:text-gray-700">Dashboard</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{data.title}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{data.title}</h1>
          {data.description && (
            <p className="text-gray-600 mt-1">{data.description}</p>
          )}
          <p className="text-sm text-gray-400 mt-1">{blocks.length} Block(s)</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button className="btn-secondary text-sm" onClick={openEditHandout} disabled={isDemo}>
            Bearbeiten
          </button>
          <Link
            href={`/dashboard/handout/${handoutId}/print`}
            target="_blank"
            className="btn-secondary text-sm"
          >
            Exportieren
          </Link>
          <button className="btn-primary text-sm" onClick={handleStartSession} disabled={isDemo}>
            Session starten
          </button>
        </div>
      </div>

      {/* Blocks list */}
      <DndProvider backend={HTML5Backend}>
        <div className="space-y-3 mb-6">
          {blocks.length === 0 && (
            <div className="card text-center py-8 text-gray-500">
              <p>Noch keine Blöcke. Fügen Sie den ersten Inhalt hinzu.</p>
            </div>
          )}

          {blocks.map((block, idx) => (
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
          ))}
        </div>
      </DndProvider>

      <button
        className="btn-secondary w-full"
        onClick={() => setIsCreatingBlock(true)}
        disabled={isDemo}
      >
        + Block hinzufügen
      </button>

      {/* Create Block Modal */}
      <Modal
        isOpen={isCreatingBlock}
        onClose={() => setIsCreatingBlock(false)}
        title="Neuer Block"
        size="lg"
      >
        <BlockEditor
          handoutId={handoutId}
          onSave={() => setIsCreatingBlock(false)}
          onCancel={() => setIsCreatingBlock(false)}
        />
      </Modal>

      {/* Edit Block Modal */}
      <Modal
        isOpen={!!editingBlockId}
        onClose={() => setEditingBlockId(null)}
        title="Block bearbeiten"
        size="lg"
      >
        {editingBlockId && (
          <BlockEditor
            handoutId={handoutId}
            block={blocks.find((b) => b._id === editingBlockId)}
            onSave={() => setEditingBlockId(null)}
            onCancel={() => setEditingBlockId(null)}
          />
        )}
      </Modal>

      {/* Edit Handout Modal */}
      <Modal
        isOpen={isEditingHandout}
        onClose={() => setIsEditingHandout(false)}
        title="Handout bearbeiten"
      >
        <form onSubmit={handleSaveHandout} className="space-y-4">
          <div>
            <label className="label">Titel</label>
            <input
              className="input"
              value={handoutTitle}
              onChange={(e) => setHandoutTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Beschreibung</label>
            <textarea
              className="textarea"
              value={handoutDesc}
              onChange={(e) => setHandoutDesc(e.target.value)}
              rows={3}
            />
          </div>
          <div className="flex gap-3">
            <button type="submit" className="btn-primary flex-1" disabled={isDemo}>Speichern</button>
            <button type="button" className="btn-secondary" onClick={() => setIsEditingHandout(false)}>
              Abbrechen
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
