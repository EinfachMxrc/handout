import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// ---- Reveal Rule validator ----
const revealRuleValidator = v.object({
  revealSlide: v.number(),
  revealToSlide: v.optional(v.number()),
  relockOnBack: v.optional(v.boolean()),
  alwaysVisible: v.optional(v.boolean()),
  manuallyTriggered: v.optional(v.boolean()),
});

export default defineSchema({
  // ---- Presenters (simple password-based auth for MVP) ----
  presenters: defineTable({
    email: v.string(),
    passwordHash: v.string(),
    name: v.optional(v.string()),
    createdAt: v.number(),
    /** True for the shared demo account – all write mutations are blocked */
    isDemo: v.optional(v.boolean()),
  }).index("by_email", ["email"]),

  // ---- Presenter Sessions (auth tokens) ----
  presenterSessions: defineTable({
    presenterId: v.id("presenters"),
    token: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_presenter", ["presenterId"]),

  // ---- Handouts ----
  handouts: defineTable({
    presenterId: v.id("presenters"),
    title: v.string(),
    description: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_presenter", ["presenterId"]),

  // ---- Handout Blocks ----
  handoutBlocks: defineTable({
    handoutId: v.id("handouts"),
    title: v.string(),
    content: v.string(),
    order: v.number(),
    revealRule: revealRuleValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_handout", ["handoutId"]),

  // ---- Viewer Heartbeats (für Zuschauer-Count) ----
  viewerHeartbeats: defineTable({
    sessionId: v.id("presentationSessions"),
    /** Zufällige Client-ID, in sessionStorage des Zuschauers gespeichert */
    viewerId: v.string(),
    lastSeenAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_session_viewer", ["sessionId", "viewerId"])
    .index("by_lastSeenAt", ["lastSeenAt"]),

  // ---- Presentation Sessions ----
  presentationSessions: defineTable({
    handoutId: v.id("handouts"),
    presenterId: v.id("presenters"),
    /** Short token used in public URL: /h/[publicToken] */
    publicToken: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("live"),
      v.literal("ended")
    ),
    syncMode: v.union(
      v.literal("auto"),
      v.literal("hybrid"),
      v.literal("manual")
    ),
    currentSlide: v.number(),
    highWaterSlide: v.number(),
    totalSlides: v.optional(v.number()),
    presentationTitle: v.optional(v.string()),
    manuallyTriggeredBlockIds: v.array(v.string()),
    startedAt: v.optional(v.number()),
    endedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_presenter", ["presenterId"])
    .index("by_public_token", ["publicToken"])
    .index("by_handout", ["handoutId"]),
});
