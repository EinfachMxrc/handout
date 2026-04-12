"use client";

import type { Components } from "react-markdown";
import { Terminal } from "./Terminal";
import type { ReactNode } from "react";

/**
 * Custom ReactMarkdown components for handout reader rendering.
 *
 * Markdown conventions:
 *   ```unsafe title=app.py        → red-bordered terminal
 *   ```safe title=app.py          → green-bordered terminal
 *   ```python title=app.py        → default terminal
 *   > **156 959**\n> text          → blockquote = styled stat/callout box
 *   ---                           → salmon-colored divider
 *   <div class="grid-2"> ... </div>  → two-column layout (needs rehype-raw)
 *   <div class="stat">num</div>   → large stat number
 */

function extractMeta(className?: string): { lang: string; variant: "default" | "unsafe" | "safe" } {
  if (!className) return { lang: "", variant: "default" };

  const langMatch = className.match(/language-(\S+)/);
  const raw = langMatch?.[1] ?? "";

  // language-unsafe or language-safe → variant
  if (raw === "unsafe" || raw === "safe") {
    return { lang: raw, variant: raw };
  }

  return { lang: raw, variant: "default" };
}

export const handoutComponents: Partial<Components> = {
  // Code blocks → animated terminal
  pre({ children, ...props }) {
    // Extract the <code> child
    const codeChild = (children as any)?.props;
    if (!codeChild) {
      return <pre {...props}>{children}</pre>;
    }

    const { lang, variant } = extractMeta(codeChild.className);
    const text = typeof codeChild.children === "string"
      ? codeChild.children.replace(/\n$/, "")
      : Array.isArray(codeChild.children)
        ? codeChild.children.filter((c: unknown) => typeof c === "string").join("").replace(/\n$/, "")
        : String(codeChild.children ?? "");

    // Extract title from the code fence meta (e.g., ```python title=app.py)
    // react-markdown doesn't pass meta directly, so we parse from data attributes
    const title = codeChild["data-meta"]?.match(/title=(\S+)/)?.[1] ?? (lang && lang !== "unsafe" && lang !== "safe" ? lang : undefined);

    return <Terminal title={title} variant={variant} speed={14}>{text}</Terminal>;
  },

  // Blockquotes → callout cards with optional large stats
  blockquote({ children }) {
    return (
      <div className="callout-box">
        {children}
      </div>
    );
  },

  // Horizontal rules → salmon dividers
  hr() {
    return <hr className="handout-divider" />;
  },

  // Strong → keep bold but allow color override in reader theme
  strong({ children }) {
    return <strong>{children}</strong>;
  },
};
