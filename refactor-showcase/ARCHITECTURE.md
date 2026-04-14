# Architektur-Entscheidungen

## 1. Edge-Middleware statt Per-Route-Wrapper

**Entscheidung:** Security-Header und Rate-Limiting laufen in `middleware.ts` auf der Edge.

**Begründung:**
- Eine zentrale Stelle für Security-Policies — keine Route kann sie versehentlich vergessen.
- Edge-Runtime hat <10 ms Cold-Start, blockiert User-Latency nicht spürbar.
- Header werden VOR Page-Render gesetzt — funktioniert auch für statische Routen.

**Trade-off:** In-Memory-Rate-Limit funktioniert nur pro Edge-Instanz. Bei mehreren Regionen ist Upstash Redis nötig (`@upstash/ratelimit`). Für Schul-/Demo-Setup overkill.

## 2. Zod als Single Source of Truth

**Entscheidung:** Eingaben werden client- UND serverseitig gegen dasselbe Zod-Schema geprüft.

**Begründung:**
- Defense in Depth — manipulierte Clients oder direkte API-Calls werden serverseitig abgefangen.
- Typen werden via `z.infer<typeof schema>` automatisch abgeleitet — kein Drift zwischen Validator und Type.
- Convex hat eigene `v.*`-Validatoren für Storage-Layer-Validierung — Zod ergänzt mit reicheren Constraints (Email-Regex, Min-Length, Enum-Werte).

**Trade-off:** Doppelte Schema-Definition (Convex `v` + Zod). Akzeptabel, da Convex `v` strukturelle Validierung macht und Zod semantische.

## 3. Error Boundaries pro Route-Segment

**Entscheidung:** `error.tsx` in `/app/` (global) UND in `/app/h/[token]/` (lokal).

**Begründung:**
- Next.js App Router unterstützt nested Error Boundaries native — Reader-Fehler bricht nicht die ganze App.
- User bekommt kontextbezogene Fehlermeldung ("Reader konnte nicht laden" vs. generisch "Etwas ist schiefgelaufen").
- `reset()`-Funktion erlaubt Recovery ohne Full-Reload — bewahrt Convex-Subscription-State.

**Trade-off:** Mehr Boilerplate als globaler try/catch. Aber: bessere UX und Diagnostik.

## 4. Suspense-Skeletons statt Spinner

**Entscheidung:** `loading.tsx` zeigt Content-Shaped Skeletons, nicht generische Spinner.

**Begründung:**
- Layout-Shift wird minimiert — Skeleton hat dieselbe Struktur wie der finale Content.
- Wahrgenommene Performance ist höher (Doherty Threshold) als bei Spinnern.
- App-Router rendert das automatisch — keine manuelle State-Verwaltung nötig.

**Trade-off:** Skeletons müssen pro Seite designt werden. Lohnt sich für dauerhaft sichtbare Routen wie den Reader.

## 5. CSP mit `'unsafe-inline'` für Styles und Scripts

**Entscheidung:** CSP erlaubt `script-src 'unsafe-inline' 'unsafe-eval'` und `style-src 'unsafe-inline'`.

**Begründung:**
- Next.js injiziert inline-Skripte für Hydration und Theme-Restore (vor jeder Hydration).
- Tailwind generiert utility-Klassen die teils inline-Styles erzeugen.
- Strict CSP würde Nonce-basiertes Setup erfordern — möglich, aber für dieses Projekt ROI-negativ.

**Trade-off:** Schwächere XSS-Verteidigung. Mitigation: rehype-sanitize im Reader, Zod-Validierung aller Inputs, React's automatisches Escaping.

## 6. Strict TypeScript Overlay statt Big-Bang

**Entscheidung:** `noImplicitOverride` und `forceConsistentCasingInFileNames` aktivieren — `noUncheckedIndexedAccess` bewusst NICHT.

**Begründung:**
- `noUncheckedIndexedAccess` würde tausende Fehler in bestehendem Code erzeugen (jeder `array[0]` wird zu `T | undefined`).
- Migration wäre ein eigenes Projekt mit mehreren Tagen Aufwand.
- `noImplicitOverride` und `forceConsistentCasingInFileNames` haben null Migration-Cost und fangen reale Fehler.

**Trade-off:** Nicht maximal strict. Aber: realistischer Pfad zu mehr Strictness.

## 7. React Server Components: pragmatisch, nicht dogmatisch

**Entscheidung:** RSC für statische Pages (`not-found.tsx`, `loading.tsx`). Client Components für alles mit Convex-Subscriptions.

**Begründung:**
- Reader (`/h/[token]/page.tsx`) braucht Live-Updates via Convex `useQuery` — RSC würde hier keinen Wert bringen.
- Statische Pages (404, Loading) profitieren von RSC: 0 JS-Bundle, schnelleres TTFB.
- Über-RSC-isierung würde komplexe Data-Fetching-Workarounds erfordern, ohne Performance-Gewinn.

**Trade-off:** Keine einheitliche Render-Strategie. Akzeptabel — App-Router unterstützt Mixed Mode native.
