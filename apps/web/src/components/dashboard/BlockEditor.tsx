"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api } from "@convex/_generated/api";
import { useAuthStore } from "@/store/authStore";
import type { Id } from "@convex/_generated/dataModel";

interface BlockEditorProps {
  handoutId: string;
  block?: {
    _id: string;
    title: string;
    content: string;
    revealRule: {
      revealSlide: number;
      revealToSlide?: number;
      relockOnBack?: boolean;
      alwaysVisible?: boolean;
      manuallyTriggered?: boolean;
    };
  };
  onSave: () => void;
  onCancel: () => void;
}

export function BlockEditor({ handoutId, block, onSave, onCancel }: BlockEditorProps) {
  const { token } = useAuthStore();
  const createBlock = useMutation(api.handouts.createBlock);
  const updateBlock = useMutation(api.handouts.updateBlock);

  const [title, setTitle] = useState(block?.title ?? "");
  const [content, setContent] = useState(block?.content ?? "");
  const [revealSlide, setRevealSlide] = useState(block?.revealRule.revealSlide ?? 1);
  const [revealToSlide, setRevealToSlide] = useState<string>(
    block?.revealRule.revealToSlide?.toString() ?? ""
  );
  const [relockOnBack, setRelockOnBack] = useState(block?.revealRule.relockOnBack ?? false);
  const [alwaysVisible, setAlwaysVisible] = useState(block?.revealRule.alwaysVisible ?? false);
  const [manuallyTriggered, setManuallyTriggered] = useState(
    block?.revealRule.manuallyTriggered ?? false
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [contentTab, setContentTab] = useState<"edit" | "preview">("edit");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      setError("Nicht authentifiziert. Bitte erneut anmelden.");
      return;
    }

    setError("");
    setIsSaving(true);

    try {
      const revealToSlideNum = revealToSlide ? parseInt(revealToSlide, 10) : undefined;

      const revealRule = {
        revealSlide,
        revealToSlide: Number.isInteger(revealToSlideNum) ? revealToSlideNum : undefined,
        relockOnBack: relockOnBack || undefined,
        alwaysVisible: alwaysVisible || undefined,
        manuallyTriggered: manuallyTriggered || undefined,
      };

      if (block) {
        await updateBlock({
          token,
          blockId: block._id as Id<"handoutBlocks">,
          title,
          content,
          revealRule,
        });
      } else {
        await createBlock({
          token,
          handoutId: handoutId as Id<"handouts">,
          title,
          content,
          revealRule,
        });
      }
      onSave();
    } catch (err: any) {
      setError(err.message ?? "Fehler beim Speichern");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="label" htmlFor="block-title">
          Titel
        </label>
        <input
          id="block-title"
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Abschnittstitel"
          required
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-4">
          <label className="label !mb-0" htmlFor="block-content">
            Inhalt
          </label>
          <div className="segmented-shell">
            <button
              type="button"
              className="segmented-button"
              data-active={contentTab === "edit"}
              onClick={() => setContentTab("edit")}
            >
              Bearbeiten
            </button>
            <button
              type="button"
              className="segmented-button"
              data-active={contentTab === "preview"}
              onClick={() => setContentTab("preview")}
            >
              Vorschau
            </button>
          </div>
        </div>

        {contentTab === "edit" ? (
          <textarea
            id="block-content"
            className="textarea min-h-[14rem]"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={10}
            placeholder="## Überschrift&#10;&#10;Inhalt in Markdown..."
            required
          />
        ) : (
          <div className="rounded-[24px] border border-stone-900/8 bg-white/75 p-5">
            <div className="markdown-content min-h-[14rem]">
              {content ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
              ) : (
                <p className="text-sm text-stone-400">Noch kein Inhalt eingegeben.</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-[28px] border border-stone-900/8 bg-white/70 p-5">
        <div className="eyebrow">Reveal-Regeln</div>
        <div className="mt-4 space-y-4">
          <label className="flex items-center gap-3 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={alwaysVisible}
              onChange={(e) => {
                setAlwaysVisible(e.target.checked);
                if (e.target.checked) setManuallyTriggered(false);
              }}
              className="h-4 w-4"
            />
            Immer sichtbar
          </label>

          <label className="flex items-center gap-3 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={manuallyTriggered}
              onChange={(e) => {
                setManuallyTriggered(e.target.checked);
                if (e.target.checked) setAlwaysVisible(false);
              }}
              className="h-4 w-4"
            />
            Nur manuell freischalten
          </label>

          {!alwaysVisible && !manuallyTriggered && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="reveal-slide">
                  Ab Folie
                </label>
                <input
                  id="reveal-slide"
                  type="number"
                  className="input"
                  value={revealSlide}
                  onChange={(e) => setRevealSlide(parseInt(e.target.value, 10) || 1)}
                  min={1}
                />
              </div>
              <div>
                <label className="label" htmlFor="reveal-to-slide">
                  Bis Folie
                </label>
                <input
                  id="reveal-to-slide"
                  type="number"
                  className="input"
                  value={revealToSlide}
                  onChange={(e) => setRevealToSlide(e.target.value)}
                  min={revealSlide}
                  placeholder="optional"
                />
              </div>
              <label className="sm:col-span-2 flex items-center gap-3 text-sm text-stone-700">
                <input
                  type="checkbox"
                  checked={relockOnBack}
                  onChange={(e) => setRelockOnBack(e.target.checked)}
                  className="h-4 w-4"
                />
                Wieder sperren beim Zurückgehen
              </label>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-[22px] border border-red-300/40 bg-red-50/90 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button type="submit" className="btn-primary flex-1" disabled={isSaving}>
          {isSaving ? "Speichert..." : block ? "Aktualisieren" : "Block erstellen"}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Abbrechen
        </button>
      </div>
    </form>
  );
}
