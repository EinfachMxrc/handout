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
    /** MVP: simple 32-bit hash via simpleHash() in _utils.ts – replace with bcrypt for production */
    passwordHash: v.string(),
    name: v.optional(v.string()),
    createdAt: v.number(),
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
