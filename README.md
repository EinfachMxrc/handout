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
# Im Projekt-Root ausführen:
npx convex dev
```

Beim ersten Start:
1. Mit Convex-Account einloggen (Browser öffnet sich)
2. Neues Projekt erstellen oder bestehendes wählen
3. Convex generiert `convex/_generated/` und gibt die URL aus

**Merken Sie sich die Convex-URL** (Format: `https://xxxx.convex.cloud`)

### 3. Web-App konfigurieren

```bash
cp apps/web/.env.local.example apps/web/.env.local
# Dann NEXT_PUBLIC_CONVEX_URL=https://ihre-url.convex.cloud eintragen
```

### 4. Demo-Daten laden (optional)

```bash
# Lädt Demo-Handout + Session + Presenter-Account (demo@example.com / demo1234)
npx convex run seed:seedDemo
```

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

- [x] Monorepo-Struktur (pnpm workspaces)
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

- [ ] **PowerPoint Fullscreen-Sync:** Im Vollbild-Präsentationsmodus kein zuverlässiger Auto-Sync (Office.js-Limitation) – Workaround: Hybrid/Manuell-Modus
- [ ] **Auth:** MVP nutzt einfaches Hash-System – für Produktion: Clerk/Auth0/Convex Auth
- [ ] **Add-in Token-Übergabe:** Token muss manuell aus Browser-DevTools kopiert werden – besser: QR-Code-Login-Flow
- [ ] **Block-Reihenfolge:** Drag-and-Drop noch nicht implementiert (nur ↑/↓-Buttons)
- [ ] **Markdown-Editor:** Aktuell Textarea – Rich-Text-Editor wäre ergonomischer
- [ ] **Mehrere aktive Sessions:** Derzeit wird immer die neueste gezeigt
- [ ] **Zuschauer-Count:** Keine Anzeige, wie viele Zuschauer das Handout gerade lesen
- [ ] **Export:** PDF-Export über Browser-Druck – nativer Export wäre besser

---

## Lokale Startbefehle (Kurzversion)

```bash
# 1. Einmalig: Convex initialisieren
npx convex dev   # folgen Sie den Anweisungen, dann Ctrl+C

# 2. .env.local setzen
echo "NEXT_PUBLIC_CONVEX_URL=https://IHRE_URL.convex.cloud" > apps/web/.env.local

# 3. Demo-Daten laden
npx convex run seed:seedDemo

# Terminal A:
npx convex dev

# Terminal B:
pnpm dev:web

# Browser: http://localhost:3000
# Login: demo@example.com / demo1234
```
