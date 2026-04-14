"use client";

/**
 * Beispiel-Reader-Page mit allen Performance-Optimierungen angewendet.
 * Vergleichen gegen: apps/web/src/app/h/[token]/page.tsx
 *
 * Optimierungen:
 * 1. BlockArticle mit React.memo — re-rendert nur wenn sich eigene Props ändern.
 * 2. Event-Handler per useCallback — stabile Referenzen für Kind-Komponenten.
 * 3. Derivierte Sets (flashBlockIds) in useMemo — kein neues Set pro Render.
 * 4. Style-Konstanten module-level gehoistet — keine neuen Object-Refs pro Render.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { BlockArticle, type ReaderBlock } from "./block-article";

// Module-level Konstanten — keine Re-Allokation pro Render.
const FLASH_DURATION_MS = 3500;
const NEW_BLOCK_HIGHLIGHT_MS = 2000;

interface ReaderPageProps {
  token: string;
}

export function ReaderPageOptimized({ token }: ReaderPageProps) {
  const sessionInfo = useQuery(api.sessions.getPublicSession, { token });
  const visibleBlocks = useQuery(api.sessions.getVisibleBlocksForPublic, { token });

  const prevBlockIdsRef = useRef<Set<string>>(new Set());
  const wasHiddenRef = useRef(false);
  const [newBlockIds, setNewBlockIds] = useState<Set<string>>(new Set());
  const [flashBlockIds, setFlashBlockIds] = useState<Set<string>>(new Set());

  // Visibility-Tracking (stable useCallback — Event-Listener wird einmal registriert)
  useEffect(() => {
    const onVisibility = () => {
      wasHiddenRef.current = document.hidden;
    };
    wasHiddenRef.current = document.hidden;
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // New-Block-Detection — memoized Work, saubere Timer-Cleanup
  useEffect(() => {
    if (!visibleBlocks) return;

    const currentIds = new Set<string>(visibleBlocks.map((b: ReaderBlock) => b.id));
    const freshIds = new Set<string>();
    currentIds.forEach((id) => {
      if (!prevBlockIdsRef.current.has(id)) freshIds.add(id);
    });
    prevBlockIdsRef.current = currentIds;

    if (freshIds.size === 0) return;

    setNewBlockIds(freshIds);

    let flashTimer: ReturnType<typeof setTimeout> | undefined;
    if (wasHiddenRef.current) {
      setFlashBlockIds(freshIds);
      flashTimer = setTimeout(() => setFlashBlockIds(new Set()), FLASH_DURATION_MS);
    }

    // Smooth scroll zum ersten neuen Block
    const scrollTimer = setTimeout(() => {
      const firstId = [...freshIds][0];
      if (!firstId) return;
      document
        .querySelector(`[data-block-id="${firstId}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);

    const highlightTimer = setTimeout(() => setNewBlockIds(new Set()), NEW_BLOCK_HIGHLIGHT_MS);

    return () => {
      clearTimeout(highlightTimer);
      clearTimeout(scrollTimer);
      if (flashTimer) clearTimeout(flashTimer);
    };
  }, [visibleBlocks]);

  // PDF-Download — stabile Referenz damit Kinder nicht re-rendern
  const handleDownloadPDF = useCallback(() => {
    const previousTitle = document.title;
    document.title = sessionInfo?.handoutTitle ?? "handout";
    const restore = () => {
      document.title = previousTitle;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    window.print();
  }, [sessionInfo?.handoutTitle]);

  // Header-Info memoized
  const header = useMemo(
    () => ({
      title: sessionInfo?.handoutTitle ?? "Handout",
      description: sessionInfo?.handoutDescription,
      status: sessionInfo?.status,
    }),
    [sessionInfo?.handoutTitle, sessionInfo?.handoutDescription, sessionInfo?.status],
  );

  if (sessionInfo === undefined || visibleBlocks === undefined) return null; // loading.tsx übernimmt

  return (
    <div className="handout-reader page-shell min-h-screen py-10">
      <div className="mx-auto max-w-4xl space-y-5">
        <header className="no-print">
          <h1 className="text-4xl font-bold">{header.title}</h1>
          {header.description && <p className="mt-2 opacity-80">{header.description}</p>}
          <div className="mt-4 flex gap-3">
            {sessionInfo?.pdfUrl ? (
              <a href={sessionInfo.pdfUrl} download className="btn-secondary">
                PDF herunterladen
              </a>
            ) : (
              <button onClick={handleDownloadPDF} className="btn-secondary">
                Als PDF speichern
              </button>
            )}
          </div>
        </header>

        <main className="space-y-5">
          {visibleBlocks.map((block: ReaderBlock, idx: number) => (
            <BlockArticle
              key={block.id}
              block={block}
              index={idx}
              isNew={newBlockIds.has(block.id)}
              shouldFlash={flashBlockIds.has(block.id)}
            />
          ))}
        </main>
      </div>
    </div>
  );
}
