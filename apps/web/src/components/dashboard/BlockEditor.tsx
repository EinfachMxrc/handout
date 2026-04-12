"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
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
    imageId?: Id<"_storage">;
    imagePosition?: string;
    imageCaption?: string;
    fontSize?: string;
    layout?: string;
  };
  onSave: () => void;
  onCancel: () => void;
}

export function BlockEditor({ handoutId, block, onSave, onCancel }: BlockEditorProps) {
  const { token } = useAuthStore();
  const createBlock = useMutation(api.handouts.createBlock);
  const updateBlock = useMutation(api.handouts.updateBlock);
  const generateUploadUrl = useMutation(api.handouts.generateUploadUrl);

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

  // Image & customization state
  const [imageId, setImageId] = useState<Id<"_storage"> | undefined>(block?.imageId);
  const [imagePosition, setImagePosition] = useState(block?.imagePosition ?? "above");
  const [imageCaption, setImageCaption] = useState(block?.imageCaption ?? "");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);
  const [fontSize, setFontSize] = useState(block?.fontSize ?? "base");
  const [layout, setLayout] = useState(block?.layout ?? "default");

  // Resolve existing image URL for preview
  const existingImageUrl = useQuery(
    api.handouts.getImageUrl,
    imageId ? { storageId: imageId } : "skip"
  );

  const displayImagePreview = imagePreview ?? existingImageUrl ?? null;

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    setIsUploading(true);
    try {
      const url = await generateUploadUrl({ token });
      const result = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!result.ok) throw new Error("Upload fehlgeschlagen: " + result.status);
      const { storageId } = await result.json();
      setImageId(storageId as Id<"_storage">);
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImagePreview(URL.createObjectURL(file));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Bild-Upload fehlgeschlagen");
    } finally {
      setIsUploading(false);
    }
  }

  function removeImage() {
    setImageId(undefined);
    setImagePreview(null);
  }

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
          ...(imageId ? { imageId } : { removeImage: !imageId && !!block.imageId ? true : undefined }),
          imagePosition,
          imageCaption: imageCaption || undefined,
          fontSize,
          layout,
        });
      } else {
        await createBlock({
          token,
          handoutId: handoutId as Id<"handouts">,
          title,
          content,
          revealRule,
          imageId,
          imagePosition,
          imageCaption: imageCaption || undefined,
          fontSize,
          layout,
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
            placeholder="## Überschrift&#10;&#10;Inhalt in Markdown…"
            required
          />
        ) : (
          <div className="rounded-2xl p-5" style={{ border: "1px solid var(--line)", background: "var(--paper)" }}>
            <div className="markdown-content min-h-[14rem]">
              {content ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
              ) : (
                <p className="text-sm text-slate-400">Noch kein Inhalt eingegeben.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ---- Image Upload ---- */}
      <div className="rounded-2xl p-5" style={{ border: "1px solid var(--line)", background: "var(--paper)" }}>
        <div className="eyebrow">Bild</div>
        <div className="mt-4 space-y-3">
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={isUploading}
              className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:px-4 file:py-2 file:text-sm file:font-medium"
              style={{ color: "var(--ink-soft)" }}
            />
            {isUploading && (
              <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>Wird hochgeladen...</p>
            )}
          </div>

          {displayImagePreview && (
            <div className="relative inline-block">
              <img src={displayImagePreview} alt="Vorschau" className="max-h-48 rounded-lg" />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs text-white shadow hover:bg-red-700"
              >
                X
              </button>
            </div>
          )}

          <div>
            <label className="label" htmlFor="image-position">Position</label>
            <select
              id="image-position"
              className="input"
              value={imagePosition}
              onChange={(e) => setImagePosition(e.target.value)}
            >
              <option value="above">Ueber dem Text</option>
              <option value="below">Unter dem Text</option>
              <option value="left">Links neben Text</option>
              <option value="right">Rechts neben Text</option>
              <option value="full-width">Volle Breite</option>
              <option value="background">Hintergrundbild</option>
            </select>
          </div>

          <div>
            <label className="label" htmlFor="image-caption">Bildunterschrift</label>
            <input
              id="image-caption"
              className="input"
              value={imageCaption}
              onChange={(e) => setImageCaption(e.target.value)}
              placeholder="Bildunterschrift (optional)"
            />
          </div>
        </div>
      </div>

      {/* ---- Font Size & Layout ---- */}
      <div className="rounded-2xl p-5" style={{ border: "1px solid var(--line)", background: "var(--paper)" }}>
        <div className="eyebrow">Darstellung</div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="font-size">Schriftgroesse</label>
            <select
              id="font-size"
              className="input"
              value={fontSize}
              onChange={(e) => setFontSize(e.target.value)}
            >
              <option value="sm">Klein</option>
              <option value="base">Normal</option>
              <option value="lg">Gross</option>
              <option value="xl">Sehr gross</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="layout">Layout</label>
            <select
              id="layout"
              className="input"
              value={layout}
              onChange={(e) => setLayout(e.target.value)}
            >
              <option value="default">Standard</option>
              <option value="centered">Zentriert</option>
              <option value="wide">Breit</option>
              <option value="compact">Kompakt</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-2xl p-5" style={{ border: "1px solid var(--line)", background: "var(--paper)" }}>
        <div className="eyebrow">Reveal-Regeln</div>
        <div className="mt-4 space-y-4">
          <label className="flex items-center gap-3 text-sm" style={{ color: "var(--ink-soft)" }}>
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

          <label className="flex items-center gap-3 text-sm" style={{ color: "var(--ink-soft)" }}>
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
              <label className="sm:col-span-2 flex items-center gap-3 text-sm" style={{ color: "var(--ink-soft)" }}>
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
        <div className="rounded-2xl border border-red-300/40 bg-red-50/90 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300">
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
