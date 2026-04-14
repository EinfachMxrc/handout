"use client";

import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import { TerminalFlashContext } from "@/components/ui/Terminal";
import { handoutComponents } from "@/components/ui/HandoutComponents";

/**
 * Memoizierte Artikel-Komponente für einen einzelnen Handout-Block.
 *
 * Warum memo():
 * Die Parent-Komponente rendert die komplette Block-Liste bei jedem Convex-Update
 * (neue Blöcke, Flash-State, etc.). Ohne memo() parsen alle ReactMarkdown-Instanzen
 * ihren Content bei jedem Parent-Render neu — teuer bei 10+ Blöcken.
 *
 * memo() mit default shallow-compare reicht: Props sind entweder primitives (string,
 * number) oder stable (block-Objekte aus Convex haben Referenz-Identität bis sie sich
 * ändern). Caller MUSS garantieren, dass isNew/shouldFlash stable-by-value sind.
 */

export type ReaderBlock = {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  imagePosition?: string;
  imageCaption?: string;
  fontSize?: string;
  layout?: string;
};

interface BlockArticleProps {
  block: ReaderBlock;
  index: number;
  isNew: boolean;
  shouldFlash: boolean;
}

const FONT_SIZE_CLASS: Record<string, string> = {
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
};

const LAYOUT_CLASS: Record<string, string> = {
  default: "",
  centered: "text-center mx-auto max-w-2xl",
  wide: "max-w-none",
  compact: "max-w-lg mx-auto",
};

function BlockArticleImpl({ block, index, isNew, shouldFlash }: BlockArticleProps) {
  const fontSizeClass = FONT_SIZE_CLASS[block.fontSize ?? "base"] ?? "text-base";
  const layoutClass = LAYOUT_CLASS[block.layout ?? "default"] ?? "";

  return (
    <article
      data-block-id={block.id}
      className={`handout-block card overflow-hidden ${layoutClass} ${
        isNew ? "ring-2 ring-emerald-300 dark:ring-emerald-500" : ""
      }`}
    >
      <div className="h-1 w-full bg-gradient-to-r from-[#5BB8B8] to-[#E8998D]" />

      <div className="p-6">
        <div className="flex items-center gap-2">
          <span className="block-number flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white bg-[var(--accent)]">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="eyebrow">Abschnitt</span>
        </div>

        <h2 className="mt-3 text-3xl font-bold sm:text-4xl">{block.title}</h2>

        <div className={`markdown-content mt-5 ${fontSizeClass}`}>
          <TerminalFlashContext.Provider value={shouldFlash}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw, rehypeSanitize]}
              components={handoutComponents}
            >
              {block.content}
            </ReactMarkdown>
          </TerminalFlashContext.Provider>
        </div>
      </div>
    </article>
  );
}

/**
 * Custom equality — verhindert Re-Render, wenn nur andere Blöcke sich geändert haben.
 * Vergleicht flache Props explicit statt default shallowCompare, um sicherzugehen,
 * dass tiefe block-Properties ebenfalls stabil sind.
 */
function areEqual(prev: BlockArticleProps, next: BlockArticleProps): boolean {
  return (
    prev.block === next.block &&
    prev.index === next.index &&
    prev.isNew === next.isNew &&
    prev.shouldFlash === next.shouldFlash
  );
}

export const BlockArticle = memo(BlockArticleImpl, areEqual);
