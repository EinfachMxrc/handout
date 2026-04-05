/**
 * Seed / Demo-Daten für lokale Entwicklung.
 * Ausführen mit: npx convex run seed:seedDemo
 */

import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { generateToken } from "./_utils";

function simpleHash(password: string): string {
  let hash = 0;
  const salted = `slide-handout-mvp:${password}`;
  for (let i = 0; i < salted.length; i++) {
    const char = salted.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `mvp_${Math.abs(hash).toString(16)}`;
}

export const seedDemo = mutation({
  args: {},
  handler: async (ctx) => {
    // Create demo presenter
    const existing = await ctx.db
      .query("presenters")
      .withIndex("by_email", (q) => q.eq("email", "demo@example.com"))
      .first();

    let presenterId = existing?._id;

    if (!existing) {
      presenterId = await ctx.db.insert("presenters", {
        email: "demo@example.com",
        passwordHash: simpleHash("demo1234"),
        name: "Demo Presenter",
        createdAt: Date.now(),
      });
    }

    if (!presenterId) throw new Error("No presenter ID");

    // Create demo handout
    const now = Date.now();
    const handoutId = await ctx.db.insert("handouts", {
      presenterId,
      title: "Einführung in KI & Machine Learning",
      description: "Begleit-Handout zur Präsentation",
      createdAt: now,
      updatedAt: now,
    });

    // Create blocks
    const blocks = [
      {
        title: "Willkommen",
        content: "## Willkommen!\n\nVielen Dank für Ihr Interesse an diesem Vortrag. In den nächsten Minuten werden wir gemeinsam die Grundlagen der Künstlichen Intelligenz erkunden.",
        order: 0,
        revealRule: { revealSlide: 1, alwaysVisible: true },
      },
      {
        title: "Was ist KI?",
        content: "## Was ist Künstliche Intelligenz?\n\n**Definition:** KI ist die Simulation menschlicher Denkprozesse durch Maschinen.\n\n- Maschinelles Lernen\n- Neuronale Netze\n- Deep Learning\n- Natürliche Sprachverarbeitung (NLP)",
        order: 1,
        revealRule: { revealSlide: 2 },
      },
      {
        title: "Geschichte der KI",
        content: "## Geschichte\n\n| Jahr | Meilenstein |\n|------|------------|\n| 1950 | Turing-Test |\n| 1956 | Begriff \"KI\" geprägt |\n| 1997 | Deep Blue schlägt Kasparov |\n| 2012 | Deep Learning Revolution |\n| 2022 | ChatGPT Launch |",
        order: 2,
        revealRule: { revealSlide: 3 },
      },
      {
        title: "Machine Learning Grundlagen",
        content: "## Machine Learning\n\nMaschinelles Lernen ermöglicht es Systemen, aus Erfahrungen zu lernen.\n\n**Drei Arten:**\n1. Überwachtes Lernen\n2. Unüberwachtes Lernen\n3. Bestärkendes Lernen\n\n> \"ML is the study of computer algorithms that can improve automatically through experience.\"",
        order: 3,
        revealRule: { revealSlide: 5 },
      },
      {
        title: "Praxisbeispiele",
        content: "## KI im Alltag\n\n- **Sprachassistenten** – Siri, Alexa, Google\n- **Empfehlungssysteme** – Netflix, Spotify\n- **Bildverarbeitung** – Gesichtserkennung, Medizin\n- **Autonomes Fahren** – Tesla, Waymo\n- **Generative KI** – ChatGPT, Midjourney",
        order: 4,
        revealRule: { revealSlide: 7 },
      },
      {
        title: "Weiterführende Ressourcen",
        content: "## Weiterführende Ressourcen\n\n**Bücher:**\n- \"Artificial Intelligence: A Modern Approach\" – Russell & Norvig\n- \"Deep Learning\" – Goodfellow et al.\n\n**Online-Kurse:**\n- fast.ai (kostenlos)\n- Coursera Machine Learning Specialization\n\n**Kontakt:** slides-handout@example.com",
        order: 5,
        revealRule: { revealSlide: 9 },
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

    // Create a demo session
    const publicToken = "demo1234";
    const sessionId = await ctx.db.insert("presentationSessions", {
      handoutId,
      presenterId,
      publicToken,
      status: "live",
      syncMode: "manual",
      currentSlide: 1,
      highWaterSlide: 1,
      manuallyTriggeredBlockIds: [],
      startedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    // Create auth token for demo user
    const token = generateToken(32);
    await ctx.db.insert("presenterSessions", {
      presenterId,
      token,
      createdAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
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
