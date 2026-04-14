# Refactor Showcase — Senior-Level Patterns

> Referenz-Implementierung für Architektur-, Security- und Performance-Patterns, die auf das bestehende `apps/web`-Projekt angewendet werden können.

Dieser Ordner ist **kein lauffähiges Projekt**, sondern eine kuratierte Sammlung produktionsreifer Code-Artefakte. Jede Datei zeigt ein konkretes Pattern, das sich isoliert in das bestehende Repository übernehmen lässt.

## Ziele

1. **Security by Default** — Globale Security-Header, Rate-Limiting, Input-Validierung.
2. **Graceful Degradation** — Error Boundaries pro Route-Segment, Suspense-Skeletons, 404-Handling.
3. **Typ-Sicherheit** — Zod-Schemas als Single Source of Truth, strict TypeScript.
4. **Performance** — Server Components zuerst, Client Components gezielt, Memoization wo nötig.

## Struktur

```
refactor-showcase/
├── README.md                          ← du bist hier
├── ARCHITECTURE.md                    ← architektonische Entscheidungen & Trade-offs
├── app/
│   ├── middleware.ts                  ← Edge-Middleware: CSP, HSTS, Rate-Limit
│   ├── error.tsx                      ← globaler Error Boundary
│   ├── not-found.tsx                  ← 404-Page (RSC, 0 JS)
│   ├── loading.tsx                    ← Root Suspense Fallback
│   └── h/[token]/
│       ├── error.tsx                  ← Reader-spezifischer Fehlerdialog
│       └── loading.tsx                ← Skeleton mit Shimmer
├── lib/
│   └── validation/
│       └── schemas.ts                 ← Zod-Schemas (Auth, Blocks, Handouts)
└── config/
    └── tsconfig.strict.json           ← Strict TS-Flags als Overlay
```

## Integration

Jede Datei ist so geschrieben, dass sie **ohne Anpassung** an die entsprechende Stelle in `apps/web/src/` kopiert werden kann. Die relativen Pfade in Imports (`@/components/...`, CSS-Klassen aus `globals.css`) entsprechen dem bestehenden Setup.

### Reihenfolge der Integration

1. `config/tsconfig.strict.json` → zusätzliche Flags nach `apps/web/tsconfig.json` mergen
2. `lib/validation/schemas.ts` → nach `apps/web/src/lib/validation/schemas.ts` (benötigt `npm i zod`)
3. `app/loading.tsx`, `app/not-found.tsx`, `app/error.tsx` → nach `apps/web/src/app/`
4. `app/h/[token]/{loading,error}.tsx` → nach `apps/web/src/app/h/[token]/`
5. `app/middleware.ts` → nach `apps/web/src/middleware.ts`

Nach Integration: `npx next build` muss fehlerfrei durchlaufen.

## Was bewusst **nicht** gemacht wurde

- **Tailwind v3 → v4 Migration:** v4 bricht das bestehende PostCSS-Setup, v3.4 ist LTS und läuft stabil. Migration ist ein separates Projekt.
- **Komplett-Rewrite vorhandener Komponenten:** Bestehende UI (Terminal, Reader, Editor) ist funktional korrekt und getestet. Rewrite ohne Test-Suite wäre Risiko ohne Mehrwert.
- **React Server Component Migration des Readers:** Reader ist inhärent interaktiv (Convex-Subscriptions, Animationen). Server Components würden hier nicht helfen.
