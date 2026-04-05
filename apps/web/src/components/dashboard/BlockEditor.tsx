"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setError("");
    setIsSaving(true);

    try {
      const revealRule = {
        revealSlide,
        revealToSlide: revealToSlide ? parseInt(revealToSlide) : undefined,
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Titel</label>
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Abschnitt-Titel"
          required
        />
      </div>

      <div>
        <label className="label">Inhalt (Markdown)</label>
        <textarea
          className="textarea"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={8}
          placeholder="## Überschrift&#10;&#10;Inhalt in Markdown..."
          required
        />
      </div>

      <div className="border-t pt-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Freischalt-Regeln</h3>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="alwaysVisible"
              checked={alwaysVisible}
              onChange={(e) => {
                setAlwaysVisible(e.target.checked);
                if (e.target.checked) setManuallyTriggered(false);
              }}
              className="w-4 h-4"
            />
            <label htmlFor="alwaysVisible" className="text-sm text-gray-700">
              Immer sichtbar (ignoriert Folien-Logik)
            </label>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="manuallyTriggered"
              checked={manuallyTriggered}
              onChange={(e) => {
                setManuallyTriggered(e.target.checked);
                if (e.target.checked) setAlwaysVisible(false);
              }}
              className="w-4 h-4"
            />
            <label htmlFor="manuallyTriggered" className="text-sm text-gray-700">
              Nur manuell freischalten
            </label>
          </div>

          {!alwaysVisible && !manuallyTriggered && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Ab Folie</label>
                  <input
                    type="number"
                    className="input"
                    value={revealSlide}
                    onChange={(e) => setRevealSlide(parseInt(e.target.value) || 1)}
                    min={1}
                  />
                </div>
                <div>
                  <label className="label">Bis Folie (optional)</label>
                  <input
                    type="number"
                    className="input"
                    value={revealToSlide}
                    onChange={(e) => setRevealToSlide(e.target.value)}
                    min={revealSlide}
                    placeholder="–"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="relockOnBack"
                  checked={relockOnBack}
                  onChange={(e) => setRelockOnBack(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="relockOnBack" className="text-sm text-gray-700">
                  Wieder sperren beim Zurückgehen
                </label>
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-2">
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
