/**
 * Session management: start, stop, slide control.
 * This is the heart of the realtime sync.
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { generateToken, isBlockVisible } from "./_utils";

// ---- AUTH HELPER ----
async function requirePresenter(ctx: any, token: string) {
  const session = await ctx.db
    .query("presenterSessions")
    .withIndex("by_token", (q: any) => q.eq("token", token))
    .first();

  if (!session || session.expiresAt < Date.now()) {
    throw new Error("Nicht autorisiert");
  }

  const presenter = await ctx.db.get(session.presenterId);
  if (!presenter) throw new Error("Nicht autorisiert");

  return presenter;
}

// ============================================================
// PRESENTER QUERIES
// ============================================================

export const listSessions = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const presenter = await requirePresenter(ctx, args.token);
    return ctx.db
      .query("presentationSessions")
      .withIndex("by_presenter", (q: any) => q.eq("presenterId", presenter._id))
      .order("desc")
      .collect();
  },
});

export const getPresenterSessionState = query({
  args: { token: v.string(), sessionId: v.id("presentationSessions") },
  handler: async (ctx, args) => {
    const presenter = await requirePresenter(ctx, args.token);
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.presenterId !== presenter._id) {
      throw new Error("Session nicht gefunden");
    }

    const handout = await ctx.db.get(session.handoutId);
    const blocks = await ctx.db
      .query("handoutBlocks")
      .withIndex("by_handout", (q: any) => q.eq("handoutId", session.handoutId))
      .collect();

    const blocksWithVisibility = blocks
      .sort((a, b) => a.order - b.order)
      .map((block) => ({
        ...block,
        isVisible: isBlockVisible(block, session),
      }));

    return {
      session,
      handout,
      blocks: blocksWithVisibility,
      publicUrl: `/h/${session.publicToken}`,
    };
  },
});

// ============================================================
// PUBLIC QUERIES (no auth required)
// ============================================================

/**
 * Public session info – safe to expose, no private data.
 */
export const getPublicSession = query({
  args: { publicToken: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("presentationSessions")
      .withIndex("by_public_token", (q: any) => q.eq("publicToken", args.publicToken))
      .first();

    if (!session) return null;
    if (session.status === "ended") {
      // Still show ended sessions so viewers see the final state
    }

    const handout = await ctx.db.get(session.handoutId);
    if (!handout) return null;

    return {
      sessionId: session._id,
      handoutTitle: handout.title,
      handoutDescription: handout.description,
      status: session.status,
      currentSlide: session.currentSlide,
      syncMode: session.syncMode,
      presentationTitle: session.presentationTitle,
    };
  },
});

/**
 * PUBLIC: Only returns blocks that are truly visible at the current slide.
 * SECURITY: unrevealed content is NEVER sent to this endpoint.
 */
export const getVisibleBlocksForPublic = query({
  args: { publicToken: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("presentationSessions")
      .withIndex("by_public_token", (q: any) => q.eq("publicToken", args.publicToken))
      .first();

    if (!session) return [];

    const blocks = await ctx.db
      .query("handoutBlocks")
      .withIndex("by_handout", (q: any) => q.eq("handoutId", session.handoutId))
      .collect();

    // Server-side filter: only visible blocks
    const visibleBlocks = blocks.filter((block) => isBlockVisible(block, session));

    // Return ONLY safe public data – no reveal rules exposed
    return visibleBlocks
      .sort((a, b) => a.order - b.order)
      .map((block) => ({
        id: block._id,
        title: block.title,
        content: block.content,
        order: block.order,
      }));
  },
});

// ============================================================
// SESSION MUTATIONS
// ============================================================

export const createSession = mutation({
  args: {
    token: v.string(),
    handoutId: v.id("handouts"),
  },
  handler: async (ctx, args) => {
    const presenter = await requirePresenter(ctx, args.token);
    const handout = await ctx.db.get(args.handoutId);
    if (!handout || handout.presenterId !== presenter._id) {
      throw new Error("Handout nicht gefunden");
    }

    const publicToken = generateToken(8);
    const now = Date.now();

    return ctx.db.insert("presentationSessions", {
      handoutId: args.handoutId,
      presenterId: presenter._id,
      publicToken,
      status: "draft",
      syncMode: "manual",
      currentSlide: 1,
      highWaterSlide: 1,
      manuallyTriggeredBlockIds: [],
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const startSession = mutation({
  args: {
    token: v.string(),
    sessionId: v.id("presentationSessions"),
  },
  handler: async (ctx, args) => {
    const presenter = await requirePresenter(ctx, args.token);
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.presenterId !== presenter._id) {
      throw new Error("Session nicht gefunden");
    }

    await ctx.db.patch(args.sessionId, {
      status: "live",
      startedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const stopSession = mutation({
  args: {
    token: v.string(),
    sessionId: v.id("presentationSessions"),
  },
  handler: async (ctx, args) => {
    const presenter = await requirePresenter(ctx, args.token);
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.presenterId !== presenter._id) {
      throw new Error("Session nicht gefunden");
    }

    await ctx.db.patch(args.sessionId, {
      status: "ended",
      endedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const deleteSession = mutation({
  args: {
    token: v.string(),
    sessionId: v.id("presentationSessions"),
  },
  handler: async (ctx, args) => {
    const presenter = await requirePresenter(ctx, args.token);
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.presenterId !== presenter._id) {
      throw new Error("Session nicht gefunden");
    }
    await ctx.db.delete(args.sessionId);
  },
});

// ---- Slide control ----

export const setCurrentSlide = mutation({
  args: {
    token: v.string(),
    sessionId: v.id("presentationSessions"),
    slideNumber: v.number(),
    totalSlides: v.optional(v.number()),
    presentationTitle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const presenter = await requirePresenter(ctx, args.token);
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.presenterId !== presenter._id) {
      throw new Error("Session nicht gefunden");
    }

    const newSlide = Math.max(1, args.slideNumber);
    const newHighWater = Math.max(session.highWaterSlide, newSlide);

    const updates: Record<string, unknown> = {
      currentSlide: newSlide,
      highWaterSlide: newHighWater,
      updatedAt: Date.now(),
    };
    if (args.totalSlides !== undefined) updates.totalSlides = args.totalSlides;
    if (args.presentationTitle !== undefined) updates.presentationTitle = args.presentationTitle;

    await ctx.db.patch(args.sessionId, updates as any);
  },
});

export const nextSlide = mutation({
  args: {
    token: v.string(),
    sessionId: v.id("presentationSessions"),
  },
  handler: async (ctx, args) => {
    const presenter = await requirePresenter(ctx, args.token);
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.presenterId !== presenter._id) {
      throw new Error("Session nicht gefunden");
    }

    const newSlide = session.currentSlide + 1;
    const maxSlide = session.totalSlides ?? 9999;
    const clamped = Math.min(newSlide, maxSlide);

    await ctx.db.patch(args.sessionId, {
      currentSlide: clamped,
      highWaterSlide: Math.max(session.highWaterSlide, clamped),
      updatedAt: Date.now(),
    });
    return clamped;
  },
});

export const previousSlide = mutation({
  args: {
    token: v.string(),
    sessionId: v.id("presentationSessions"),
  },
  handler: async (ctx, args) => {
    const presenter = await requirePresenter(ctx, args.token);
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.presenterId !== presenter._id) {
      throw new Error("Session nicht gefunden");
    }

    const newSlide = Math.max(1, session.currentSlide - 1);
    await ctx.db.patch(args.sessionId, {
      currentSlide: newSlide,
      updatedAt: Date.now(),
      // highWaterSlide does NOT decrease
    });
    return newSlide;
  },
});

export const jumpToSlide = mutation({
  args: {
    token: v.string(),
    sessionId: v.id("presentationSessions"),
    slideNumber: v.number(),
  },
  handler: async (ctx, args) => {
    const presenter = await requirePresenter(ctx, args.token);
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.presenterId !== presenter._id) {
      throw new Error("Session nicht gefunden");
    }

    const newSlide = Math.max(1, args.slideNumber);
    await ctx.db.patch(args.sessionId, {
      currentSlide: newSlide,
      highWaterSlide: Math.max(session.highWaterSlide, newSlide),
      updatedAt: Date.now(),
    });
  },
});

export const setSyncMode = mutation({
  args: {
    token: v.string(),
    sessionId: v.id("presentationSessions"),
    syncMode: v.union(v.literal("auto"), v.literal("hybrid"), v.literal("manual")),
  },
  handler: async (ctx, args) => {
    const presenter = await requirePresenter(ctx, args.token);
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.presenterId !== presenter._id) {
      throw new Error("Session nicht gefunden");
    }

    await ctx.db.patch(args.sessionId, {
      syncMode: args.syncMode,
      updatedAt: Date.now(),
    });
  },
});

export const triggerBlockManually = mutation({
  args: {
    token: v.string(),
    sessionId: v.id("presentationSessions"),
    blockId: v.string(),
  },
  handler: async (ctx, args) => {
    const presenter = await requirePresenter(ctx, args.token);
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.presenterId !== presenter._id) {
      throw new Error("Session nicht gefunden");
    }

    if (!session.manuallyTriggeredBlockIds.includes(args.blockId)) {
      await ctx.db.patch(args.sessionId, {
        manuallyTriggeredBlockIds: [...session.manuallyTriggeredBlockIds, args.blockId],
        updatedAt: Date.now(),
      });
    }
  },
});

export const unTriggerBlockManually = mutation({
  args: {
    token: v.string(),
    sessionId: v.id("presentationSessions"),
    blockId: v.string(),
  },
  handler: async (ctx, args) => {
    const presenter = await requirePresenter(ctx, args.token);
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.presenterId !== presenter._id) {
      throw new Error("Session nicht gefunden");
    }

    await ctx.db.patch(args.sessionId, {
      manuallyTriggeredBlockIds: session.manuallyTriggeredBlockIds.filter(
        (id) => id !== args.blockId
      ),
      updatedAt: Date.now(),
    });
  },
});
