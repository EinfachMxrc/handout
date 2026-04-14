# Slide Handout MVP

Live-Handout für Präsentationen. Inhalte schalten sich Folie für Folie frei – live im Browser der Zuschauer.

## Architektur

```
slide-handout/
├── apps/
│   ├── web/                    Next.js 15 + React 19 + Tailwind
│   └── powerpoint-addin/       React + Vite + Office.js
├── packages/
│   ├── reveal-engine/          Pure TypeScript Reveal-Logik + Tests
│   └── shared/                 Gemeinsame Typen
└── convex/                     Backend: Schema, Queries, Mutations
```

**Architektur-Entscheidungen:**

| Schicht | Verantwortung |
|---------|---------------|
| Convex | Source of Truth: currentSlide, Session-Status, sichtbare Blöcke, Auth-Token |
| Zustand | Lokaler UI-State: Modals, Editor-Drafts, Add-in Verbindungsstatus |
| Reveal Engine | Pure TS Domainlogik, unabhängig von UI und Convex |
| Next.js App Router | Web-App (öffentlich + Dashboard) |
| Office.js | PowerPoint-Integration mit automatischem Fallback |

**Sicherheit:** Öffentliche Convex-Queries filtern Blöcke serverseitig. Unveröffentlichte Inhalte werden NIEMALS an den öffentlichen Client übertragen.

---

## Voraussetzungen

- Node.js 18+ (getestet mit Node 20/22)
- pnpm (`npm install -g pnpm`)
- Convex Account (kostenlos): https://dashboard.convex.dev

---

## Setup – Schritt für Schritt

### 1. Dependencies installieren

```bash
pnpm install
```

### 2. Convex einrichten (interaktiv, einmalig)

```bash
npx convex dev
```

Beim ersten Start:
1. Mit Convex-Account einloggen (Browser öffnet sich)
2. Neues Projekt erstellen oder bestehendes wählen
3. Convex schreibt automatisch `.env.local` im Root-Verzeichnis
4. Strg+C sobald „Convex ready" erscheint

### 3. Umgebungsvariablen in Apps übernehmen

```bash
pnpm setup
```

Liest die Convex-URL aus dem Root-`.env.local` und schreibt sie in:
- `apps/web/.env.local` → Next.js Web-App
- `apps/powerpoint-addin/.env.local` → PowerPoint Add-in

**Auf anderen Plattformen (Netlify, Railway, Render, VPS):**  
Setze einfach eine Umgebungsvariable in der Plattform-UI:
```
NEXT_PUBLIC_CONVEX_URL=https://dein-projekt.convex.cloud
```
Die URL findest du im [Convex Dashboard](https://dashboard.convex.dev) unter Settings → URL.

### 4. Demo-Daten (automatisch)

Demo-Daten werden beim Start von `pnpm dev:convex` **automatisch** angelegt (idempotent – nur beim ersten Mal).

```bash
# Manuell erzwingen (z. B. nach Datenbank-Reset):
pnpm seed
# oder direkt:
npx convex run init:init
```

**Demo-Account:** `demo@example.com` / `demo1234`  
**Demo-Handout:** „PowerPoint Add-in Demo" – 10 Folien, alle Freischalt-Modi demonstriert

### 5. Entwicklungsserver starten

**Terminal 1 – Convex:**
```bash
npx convex dev
```

**Terminal 2 – Web-App:**
```bash
pnpm dev:web
# Öffnet http://localhost:3000
```

**Terminal 3 – PowerPoint Add-in (optional):**
```bash
pnpm dev:addin
# Startet https://localhost:3001
```

---

## Benutzung

### Web-App

1. `http://localhost:3000` öffnen
2. Konto registrieren oder mit Demo-Daten anmelden: `demo@example.com / demo1234`
3. Handout erstellen → Blöcke anlegen (mit Reveal-Folie)
4. Session starten → öffentlichen Link/QR-Code teilen
5. Mit Folien-Steuerung navigieren → Zuschauer sehen Inhalte live

**Öffentliches Handout:** `http://localhost:3000/h/[token]`

### PowerPoint Add-in

Siehe Abschnitt "Add-in Sideloading" weiter unten.

---

## Tests ausführen

```bash
# Reveal-Engine Unit-Tests
pnpm test

# Alle Tests
pnpm test:all
```

**Test-Ergebnis:**
```
✓ src/__tests__/revealEngine.test.ts (19 tests)
```

---

## Add-in – Sideloading

### Windows (PowerPoint Desktop)

1. PowerPoint öffnen
2. `Datei → Optionen → Trust Center → Trust Center-Einstellungen → Kataloge vertrauenswürdiger Add-Ins`
3. Oder: `Einfügen → Add-Ins → Meine Add-Ins → Freigegebener Ordner`
4. Manifest-Pfad angeben: `apps/powerpoint-addin/manifest.xml`
5. Add-in erscheint unter `Start → Slide Handout`

**Voraussetzung:** Add-in-Server muss laufen (`pnpm dev:addin`)

### Mac (PowerPoint für Mac)

1. PowerPoint öffnen
2. `Einfügen → Add-Ins → Add-Ins verwalten → Aus Datei hinzufügen`
3. Manifest auswählen: `apps/powerpoint-addin/manifest.xml`
4. HTTPS erforderlich: `pnpm dev:addin` verwendet mkcert (automatisch)

### Add-in konfigurieren

Im Add-in → `Einstellungen`:
1. **Convex URL** eintragen (aus `.env.local`)
2. **Presenter-Token**: Nach Web-App-Login im Browser DevTools → Application → LocalStorage → `slide-handout-auth` → `token`
3. **Session-ID**: URL der Session-Seite (`/dashboard/session/[ID]`)

---

## Sync-Modi

| Modus | Beschreibung |
|-------|-------------|
| **Auto** | Office.js erkennt Folienänderungen automatisch (funktioniert in Normal-Ansicht) |
| **Hybrid** | Auto-Erkennung versucht es + manuelle Tasten als Fallback |
| **Manuell** | Nur manuelle Steuerung (immer verfügbar) |
| **Simulator** | Kein PowerPoint – Folienwechsel per Browser emulieren |

**Technische Realität bei PowerPoint:**
- Auto-Sync funktioniert zuverlässig in der **Normal-Ansicht** (Bearbeitung)
- Im **Vollbild-Präsentationsmodus** wird das Add-in-Taskpane von PowerPoint oft suspendiert → kein zuverlässiges Event
- Das System wechselt automatisch in Hybrid/Manuell und zeigt dies klar an
- Die manuelle Steuerung funktioniert IMMER

---

## Reveal-Logik

Die Reveal Engine (`packages/reveal-engine`) ist eine pure TypeScript-Bibliothek.

**Regeln pro Block:**

| Eigenschaft | Beschreibung | Default |
|-------------|-------------|---------|
| `revealSlide` | Ab dieser Folie sichtbar (1-basiert) | 1 |
| `revealToSlide` | Bis zu dieser Folie sichtbar (optional) | – |
| `relockOnBack` | Wieder sperren beim Zurückgehen | false |
| `alwaysVisible` | Immer sichtbar | false |
| `manuallyTriggered` | Nur manuell freischaltbar | false |

**Abnahme-Szenario:**
```
Block A ab Folie 1
Block B ab Folie 3
Block C ab Folie 5

Folie 1 → nur A sichtbar ✓
Folie 3 → A + B sichtbar ✓
Folie 5 → A + B + C sichtbar ✓
Folie 2 (zurück) → A + B noch sichtbar (highWaterSlide=5) ✓
```

---

## Was fertig ist

- [x] Monorepo-Struktur (pnpm workspaces + Turborepo task pipeline)
- [x] Reveal Engine mit vollständigen Unit-Tests (19 Tests)
- [x] Convex Backend: Schema, Auth, Handout-CRUD, Session-Management
- [x] Serverseitige Sicherheit: Öffentliche Queries filtern Inhalte
- [x] Web-App: Login, Registrierung, Dashboard
- [x] Handout-Editor mit Block-Verwaltung und Drag-Reihenfolge
- [x] Session-Steuerung: Start/Stop, Folien-Navigation
- [x] Öffentliche Handout-Seite mit Live-Sync (Convex Realtime)
- [x] Animations für neu freigeschaltete Blöcke
- [x] QR-Code-Dialog + Link-Copy
- [x] Druck/PDF-Export der öffentlichen Seite
- [x] PowerPoint Add-in mit Office.js-Integration
- [x] Automatischer Fallback: Auto → Hybrid → Manuell
- [x] Slide Simulator für Entwicklung ohne PowerPoint
- [x] Manuell-Trigger für einzelne Blöcke
- [x] Demo-Seed-Daten
- [x] Presenter-Auth (Token-basiert)

## Bekannte Grenzen / TODOs

- [x] **PowerPoint Fullscreen-Sync:** Direkteingabe der Foliennummer im Add-in als Workaround; Add-in wechselt automatisch in Hybrid/Manuell-Modus (Office.js-Limitation bleibt bestehen)
- [x] **Auth:** SHA-256 via Web Crypto API; Bestehende Legacy-Hashes werden beim nächsten Login automatisch migriert
- [x] **Add-in Token-Übergabe:** „Add-in verbinden"-Panel in der Session-Seite – Token, Session-ID und Convex-URL mit einem Klick kopierbar (kein DevTools mehr)
- [x] **Block-Reihenfolge:** Drag-and-Drop implementiert (⠿ Handle ziehen) + ↑/↓-Buttons bleiben als Fallback
- [x] **Markdown-Editor:** Vorschau-Tab im Block-Editor hinzugefügt
- [x] **Mehrere aktive Sessions:** Dashboard warnt wenn mehrere Live-Sessions für dasselbe Handout laufen
- [x] **Zuschauer-Count:** Echtzeit-Anzeige in der Session-Seite via 30s-Heartbeat (`viewerHeartbeats`-Tabelle, stündliche Bereinigung)
- [x] **Export:** Dedizierte Druckseite `/dashboard/handout/[id]/print` mit allen Blöcken + Reveal-Badges, öffnet Print-Dialog automatisch
- [x] **Demo-Seeding:** Automatisch beim `pnpm dev:convex` via `--run init:init`

---

## Lokale Startbefehle (Kurzversion)

```bash
# 1. Einmalig: Convex initialisieren + Env-Dateien anlegen
npx convex dev   # Anweisungen folgen, dann Ctrl+C
pnpm setup       # URLs in Web-App & Add-in übernehmen

## Monorepo-Tasks (Turbo)

```bash
# Build (Turbo Pipeline)
pnpm build

# Legacy fallback (identisches Paket-zu-Paket Build-Verhalten wie zuvor)
pnpm build:legacy

# Type checks / Tests
pnpm type-check
pnpm test
pnpm test:all
```

Hinweis für VPS/Deployments: `pnpm build` bleibt der primäre Einstiegspunkt. Falls ein bestehendes Deployment strikt auf die frühere Build-Reihenfolge abgestimmt war, steht `pnpm build:legacy` als kompatibler Fallback bereit.

# Terminal A – Convex Backend (startet + seed automatisch):
pnpm dev:convex

# Terminal B – Web-App:
pnpm dev:web

# Browser: http://localhost:3000
# Login: demo@example.com / demo1234
```
