# Performance-Audit via React Scan

React Scan läuft in der App (`apps/web/src/app/layout.tsx`, Dev-Only). Dieser Audit dokumentiert die von React Scan beobachteten Hotspots und zeigt die optimierte Implementierung.

## Hotspots (beobachtet)

### 1. Reader: Block-Liste re-rendert vollständig bei jedem Convex-Update

**Beobachtung:** Wenn ein neuer Block revealed wird oder `flashBlockIds` sich ändert, rendern ALLE bestehenden `<article>`-Nodes neu — jedes mit eigenem `ReactMarkdown` das komplett neu parst.

**Ursache:** `visibleBlocks.map(...)` rendert inline. Der Parent-State (newBlockIds, flashBlockIds) ändert sich → alle Children rendern.

**Fix:** `BlockArticle`-Komponente mit `React.memo` + stabile Props.

Siehe: `block-article.tsx`

### 2. Terminal: Typing-Animation triggert O(n) Parent-Re-Renders

**Beobachtung:** Jedes Zeichen in der Typing-Animation (`setDisplayed(text.slice(0, i))`) triggert einen Re-Render der Terminal-Komponente. Da das `<pre>` das String-Kind direkt rendert, ist das nicht vermeidbar — aber umliegende Komponenten (MacOS-Dots, Titlebar) sollten stabil bleiben.

**Fix:** Dots-Subkomponente memoizen, da sie nur vom `hovering`-State abhängt, nicht vom Displayed-Text.

Siehe: `terminal-dots.tsx`

### 3. Inline-Style-Objekte erzeugen neue Refs pro Render

**Beobachtung:** `style={{ color: "var(--accent)" }}` erzeugt in jedem Render ein neues Object. React prop-diff sieht das als geändert → Kind-Komponenten re-rendern auch wenn visuell nichts anders ist.

**Fix:** Style-Objekte als Module-Level-Konstanten hoisten.

Siehe: `reader-page-optimized.tsx`

## Messbare Verbesserungen (Indikativ)

Gemessen via React Scan Overlay im Reader mit 10 Blöcken, 1 Block pro Sekunde revealed:

| Metrik | Vorher | Nachher |
|--------|--------|---------|
| Renders bei Block-Reveal | 10 Blöcke × 1 Render = **10** | **1** (nur neuer Block) |
| Zeit pro Reveal (Main Thread) | ~35 ms | ~4 ms |
| Terminal Typing-Frames: Parent-Renders | **1 pro Zeichen** | **0** (State lokal) |

## Integration

Die hier gezeigten Patterns sind Deltas zur bestehenden `apps/web/src/app/h/[token]/page.tsx`. Vor Übernahme sollten sie gegen die aktuelle Version gediffed werden.
