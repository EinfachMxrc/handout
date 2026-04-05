/**
 * Handout CRUD operations (presenter-only).
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const revealRuleArg = v.object({
  revealSlide: v.number(),
  revealToSlide: v.optional(v.number()),
  relockOnBack: v.optional(v.boolean()),
  alwaysVisible: v.optional(v.boolean()),
  manuallyTriggered: v.optional(v.boolean()),
});

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

// ---- HANDOUT QUERIES ----

export const listHandouts = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const presenter = await requirePresenter(ctx, args.token);
    return ctx.db
      .query("handouts")
      .withIndex("by_presenter", (q: any) => q.eq("presenterId", presenter._id))
      .order("desc")
      .collect();
  },
});

export const getHandout = query({
  args: { token: v.string(), handoutId: v.id("handouts") },
  handler: async (ctx, args) => {
    const presenter = await requirePresenter(ctx, args.token);
    const handout = await ctx.db.get(args.handoutId);
    if (!handout || handout.presenterId !== presenter._id) {
      throw new Error("Handout nicht gefunden");
    }
    return handout;
  },
});

export const getHandoutWithBlocks = query({
  args: { token: v.string(), handoutId: v.id("handouts") },
  handler: async (ctx, args) => {
    const presenter = await requirePresenter(ctx, args.token);
    const handout = await ctx.db.get(args.handoutId);
    if (!handout || handout.presenterId !== presenter._id) {
      throw new Error("Handout nicht gefunden");
    }

    const blocks = await ctx.db
      .query("handoutBlocks")
      .withIndex("by_handout", (q: any) => q.eq("handoutId", args.handoutId))
      .collect();

    return {
      ...handout,
      blocks: blocks.sort((a, b) => a.order - b.order),
    };
  },
});

// ---- HANDOUT MUTATIONS ----

export const createHandout = mutation({
  args: {
    token: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const presenter = await requirePresenter(ctx, args.token);
    const now = Date.now();
    return ctx.db.insert("handouts", {
      presenterId: presenter._id,
      title: args.title,
      description: args.description,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateHandout = mutation({
  args: {
    token: v.string(),
    handoutId: v.id("handouts"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const presenter = await requirePresenter(ctx, args.token);
    const handout = await ctx.db.get(args.handoutId);
    if (!handout || handout.presenterId !== presenter._id) {
      throw new Error("Nicht gefunden");
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;

    await ctx.db.patch(args.handoutId, updates as any);
  },
});

export const deleteHandout = mutation({
  args: { token: v.string(), handoutId: v.id("handouts") },
  handler: async (ctx, args) => {
    const presenter = await requirePresenter(ctx, args.token);
    const handout = await ctx.db.get(args.handoutId);
    if (!handout || handout.presenterId !== presenter._id) {
      throw new Error("Nicht gefunden");
    }

    // Delete all blocks
    const blocks = await ctx.db
      .query("handoutBlocks")
      .withIndex("by_handout", (q: any) => q.eq("handoutId", args.handoutId))
      .collect();
    for (const block of blocks) {
      await ctx.db.delete(block._id);
    }

    await ctx.db.delete(args.handoutId);
  },
});

// ---- BLOCK MUTATIONS ----

export const createBlock = mutation({
  args: {
    token: v.string(),
    handoutId: v.id("handouts"),
    title: v.string(),
    content: v.string(),
    revealRule: revealRuleArg,
  },
  handler: async (ctx, args) => {
    const presenter = await requirePresenter(ctx, args.token);
    const handout = await ctx.db.get(args.handoutId);
    if (!handout || handout.presenterId !== presenter._id) {
      throw new Error("Nicht gefunden");
    }

    // Determine next order
    const existingBlocks = await ctx.db
      .query("handoutBlocks")
      .withIndex("by_handout", (q: any) => q.eq("handoutId", args.handoutId))
      .collect();
    const maxOrder = existingBlocks.reduce((max, b) => Math.max(max, b.order), -1);

    const now = Date.now();
    return ctx.db.insert("handoutBlocks", {
      handoutId: args.handoutId,
      title: args.title,
      content: args.content,
      order: maxOrder + 1,
      revealRule: args.revealRule,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateBlock = mutation({
  args: {
    token: v.string(),
    blockId: v.id("handoutBlocks"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    revealRule: v.optional(revealRuleArg),
  },
  handler: async (ctx, args) => {
    const presenter = await requirePresenter(ctx, args.token);
    const block = await ctx.db.get(args.blockId);
    if (!block) throw new Error("Block nicht gefunden");

    const handout = await ctx.db.get(block.handoutId);
    if (!handout || handout.presenterId !== presenter._id) {
      throw new Error("Nicht autorisiert");
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.title !== undefined) updates.title = args.title;
    if (args.content !== undefined) updates.content = args.content;
    if (args.revealRule !== undefined) updates.revealRule = args.revealRule;

    await ctx.db.patch(args.blockId, updates as any);
  },
});

export const deleteBlock = mutation({
  args: { token: v.string(), blockId: v.id("handoutBlocks") },
  handler: async (ctx, args) => {
    const presenter = await requirePresenter(ctx, args.token);
    const block = await ctx.db.get(args.blockId);
    if (!block) throw new Error("Block nicht gefunden");

    const handout = await ctx.db.get(block.handoutId);
    if (!handout || handout.presenterId !== presenter._id) {
      throw new Error("Nicht autorisiert");
    }

    await ctx.db.delete(args.blockId);
  },
});

export const reorderBlocks = mutation({
  args: {
    token: v.string(),
    handoutId: v.id("handouts"),
    /** Array of block IDs in new order */
    blockIds: v.array(v.id("handoutBlocks")),
  },
  handler: async (ctx, args) => {
    const presenter = await requirePresenter(ctx, args.token);
    const handout = await ctx.db.get(args.handoutId);
    if (!handout || handout.presenterId !== presenter._id) {
      throw new Error("Nicht autorisiert");
    }

    for (let i = 0; i < args.blockIds.length; i++) {
      await ctx.db.patch(args.blockIds[i], { order: i, updatedAt: Date.now() });
    }
  },
});
