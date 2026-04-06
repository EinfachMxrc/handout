/**
 * Idempotentes Demo-Seeding – wird automatisch beim Dev-Start ausgeführt.
 * Erstellt Demo-Daten nur wenn sie noch nicht existieren.
 *
 * Automatisch via:   npx convex dev --run init:init
 * Manuell:           npx convex run init:init
 */

import { internalMutation } from "./_generated/server";
import { generateToken, sha256Hash } from "./_utils";

export const init = internalMutation({
  args: {},
  handler: async (ctx) => {
    // ---- Demo Presenter ----
    const existing = await ctx.db
      .query("presenters")
      .withIndex("by_email", (q) => q.eq("email", "demo@example.com"))
      .first();

    let presenterId = existing?._id;

    if (!existing) {
      presenterId = await ctx.db.insert("presenters", {
        email: "demo@example.com",
        passwordHash: await sha256Hash("demo1234"),
        name: "Demo Presenter",
        createdAt: Date.now(),
      });
    }

    if (!presenterId) throw new Error("No presenter ID");

    // ---- Prüfen ob Demo-Handout bereits existiert ----
    const existingHandouts = await ctx.db
      .query("handouts")
      .withIndex("by_presenter", (q) => q.eq("presenterId", presenterId!))
      .collect();

    if (existingHandouts.length > 0) {
      return {
        message: "Demo-Daten bereits vorhanden – nichts geändert.",
        login: { email: "demo@example.com", password: "demo1234" },
      };
    }

    // ---- PowerPoint-Test-Handout (10 Folien) ----
    const now = Date.now();
    const handoutId = await ctx.db.insert("handouts", {
      presenterId,
      title: "PowerPoint Add-in Demo",
      description:
        "Test-Handout mit 10 Folien – zeigt alle Freischalt-Modes und eignet sich direkt zum Testen des Add-ins",
      createdAt: now,
      updatedAt: now,
    });

    const blocks = [
      {
        title: "Willkommen (immer sichtbar)",
        content:
          "## Willkommen!\n\nDieses Handout demonstriert alle Freischalt-Modi.\n\n> Öffne das PowerPoint Add-in und navigiere durch die Folien – die Inhalte erscheinen live.\n\n_Dieser Block ist immer sichtbar (alwaysVisible)._",
        order: 0,
        revealRule: { revealSlide: 1, alwaysVisible: true },
      },
      {
        title: "Folie 2 – Agenda",
        content:
          "## Agenda\n\n1. Einführung & Überblick\n2. Live-Demo des Add-ins\n3. Sync-Modi erklärt\n4. Tipps für den Präsentationsmodus\n5. Fragen & Antworten\n\n_Erscheint ab Folie 2._",
        order: 1,
        revealRule: { revealSlide: 2 },
      },
      {
        title: "Folie 3 – Wie es funktioniert",
        content:
          "## Wie funktioniert Slide Handout?\n\n1. **Presenter** öffnet das Add-in in PowerPoint\n2. Das Add-in erkennt die aktuelle Folie automatisch\n3. Zuschauer sehen genau die Inhalte zur aktuellen Folie\n4. Neue Blöcke erscheinen mit Animation\n\n_Erscheint ab Folie 3._",
        order: 2,
        revealRule: { revealSlide: 3 },
      },
      {
        title: "Folie 4 – Folie 4 bis 6 sichtbar",
        content:
          "## Zeitlich begrenzter Inhalt\n\nDieser Block ist **nur auf Folien 4–6** sichtbar.\n\nNach Folie 6 verschwindet er wieder (revealToSlide).\n\n_Erscheint ab Folie 4, endet nach Folie 6._",
        order: 3,
        revealRule: { revealSlide: 4, revealToSlide: 6 },
      },
      {
        title: "Folie 5 – Sync-Modi",
        content:
          "## Sync-Modi im Vergleich\n\n| Modus | Beschreibung |\n|-------|-------------|\n| **Auto** | Folienwechsel automatisch erkannt (Normal-Ansicht) |\n| **Hybrid** | Auto + manuelle Tasten als Fallback |\n| **Manuell** | Nur per Klick – immer verfügbar |\n\n💡 **Empfehlung:** Hybrid-Modus für Präsentationen\n\n_Erscheint ab Folie 5._",
        order: 4,
        revealRule: { revealSlide: 5 },
      },
      {
        title: "Folie 7 – PowerPoint Vollbild-Hinweis",
        content:
          "## Hinweis zum Vollbild-Modus\n\n⚠️ Im **Vollbild-Präsentationsmodus** suspendiert PowerPoint das Add-in.\n\n**Lösung:** Nutze den **Hybrid**- oder **Manuell**-Modus und steuere die Folien über das Browser-Fenster.\n\n_Erscheint ab Folie 7._",
        order: 5,
        revealRule: { revealSlide: 7 },
      },
      {
        title: "Folie 8 – relockOnBack Test",
        content:
          "## Zurücksperr-Test\n\nDieser Block **sperrt sich wieder**, wenn du auf eine frühere Folie zurückgehst (relockOnBack).\n\nGehe auf Folie 7 zurück → Block verschwindet.\nGehe wieder auf Folie 8 → Block erscheint erneut.\n\n_Erscheint ab Folie 8, sperrt beim Zurückgehen._",
        order: 6,
        revealRule: { revealSlide: 8, relockOnBack: true },
      },
      {
        title: "Manuell-Trigger (jederzeit)",
        content:
          "## Manuell freigeschaltet\n\nDieser Block wird **nicht automatisch** freigeschaltet.\n\nDer Presenter klickt in der Dashboard-Steuerung auf **Freischalten**.\n\n✅ Ideal für Bonusmaterial, Überraschungsfolien oder Q&A-Inhalte.",
        order: 7,
        revealRule: { revealSlide: 1, manuallyTriggered: true },
      },
      {
        title: "Folie 9 – Ressourcen",
        content:
          "## Weiterführende Ressourcen\n\n- **Convex Docs:** https://docs.convex.dev\n- **Office.js Docs:** https://learn.microsoft.com/office/dev/add-ins\n- **React Markdown:** https://github.com/remarkjs/react-markdown\n\n_Erscheint ab Folie 9._",
        order: 8,
        revealRule: { revealSlide: 9 },
      },
      {
        title: "Folie 10 – Vielen Dank",
        content:
          "## Vielen Dank!\n\nFragen? Jetzt ist der richtige Zeitpunkt.\n\n---\n\n**Login:** demo@example.com / demo1234\n\n_Letzte Folie (10) – sperrt sich beim Zurückgehen._",
        order: 9,
        revealRule: { revealSlide: 10, relockOnBack: true },
      },
    ];

    for (const block of blocks) {
      await ctx.db.insert("handoutBlocks", {
        handoutId,
        ...block,
        createdAt: now,
        updatedAt: now,
      });
    }

    // ---- Live-Session erstellen ----
    const publicToken = generateToken(8);
    const sessionId = await ctx.db.insert("presentationSessions", {
      handoutId,
      presenterId,
      publicToken,
      status: "live",
      syncMode: "hybrid",
      currentSlide: 1,
      highWaterSlide: 1,
      totalSlides: 10,
      presentationTitle: "PowerPoint Add-in Demo",
      manuallyTriggeredBlockIds: [],
      startedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    // ---- Auth-Token (1 Jahr gültig) ----
    const token = generateToken(32);
    await ctx.db.insert("presenterSessions", {
      presenterId,
      token,
      createdAt: Date.now(),
      expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
    });

    return {
      message: "Demo-Daten erfolgreich angelegt!",
      login: { email: "demo@example.com", password: "demo1234" },
      publicHandoutUrl: `/h/${publicToken}`,
      sessionId,
      presenterToken: token,
    };
  },
});
