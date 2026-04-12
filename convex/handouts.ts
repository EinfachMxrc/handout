/**
 * Handout CRUD operations (presenter-only).
 */

import { mutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { assertNotDemo } from "./_utils";

const revealRuleArg = v.object({
  revealSlide: v.number(),
  revealToSlide: v.optional(v.number()),
  relockOnBack: v.optional(v.boolean()),
  alwaysVisible: v.optional(v.boolean()),
  manuallyTriggered: v.optional(v.boolean()),
});

// ---- AUTH HELPER ----
async function requirePresenter(ctx: Pick<QueryCtx, "db">, token: string) {
  const session = await ctx.db
    .query("presenterSessions")
    .withIndex("by_token", (q) => q.eq("token", token))
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
      .withIndex("by_presenter", (q) => q.eq("presenterId", presenter._id))
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
      .withIndex("by_handout", (q) => q.eq("handoutId", args.handoutId))
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
    assertNotDemo(presenter);
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
    assertNotDemo(presenter);
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
    assertNotDemo(presenter);
    const handout = await ctx.db.get(args.handoutId);
    if (!handout || handout.presenterId !== presenter._id) {
      throw new Error("Nicht gefunden");
    }

    // Delete all blocks
    const blocks = await ctx.db
      .query("handoutBlocks")
      .withIndex("by_handout", (q) => q.eq("handoutId", args.handoutId))
      .collect();
    for (const block of blocks) {
      await ctx.db.delete(block._id);
    }

    await ctx.db.delete(args.handoutId);
  },
});

// ---- IMAGE HELPERS ----

export const generateUploadUrl = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const presenter = await requirePresenter(ctx, args.token);
    assertNotDemo(presenter);
    return await ctx.storage.generateUploadUrl();
  },
});

export const getImageUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
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
    imageId: v.optional(v.id("_storage")),
    imagePosition: v.optional(v.string()),
    imageCaption: v.optional(v.string()),
    fontSize: v.optional(v.string()),
    layout: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const presenter = await requirePresenter(ctx, args.token);
    assertNotDemo(presenter);
    const handout = await ctx.db.get(args.handoutId);
    if (!handout || handout.presenterId !== presenter._id) {
      throw new Error("Nicht gefunden");
    }

    // Determine next order
    const existingBlocks = await ctx.db
      .query("handoutBlocks")
      .withIndex("by_handout", (q) => q.eq("handoutId", args.handoutId))
      .collect();
    const maxOrder = existingBlocks.reduce((max, b) => Math.max(max, b.order), -1);

    const now = Date.now();
    return ctx.db.insert("handoutBlocks", {
      handoutId: args.handoutId,
      title: args.title,
      content: args.content,
      order: maxOrder + 1,
      revealRule: args.revealRule,
      imageId: args.imageId,
      imagePosition: args.imagePosition,
      imageCaption: args.imageCaption,
      fontSize: args.fontSize,
      layout: args.layout,
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
    imageId: v.optional(v.id("_storage")),
    removeImage: v.optional(v.boolean()),
    imagePosition: v.optional(v.string()),
    imageCaption: v.optional(v.string()),
    fontSize: v.optional(v.string()),
    layout: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const presenter = await requirePresenter(ctx, args.token);
    assertNotDemo(presenter);
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
    if (args.removeImage) {
      updates.imageId = undefined;
      updates.imageCaption = undefined;
      updates.imagePosition = undefined;
    } else if (args.imageId !== undefined) {
      updates.imageId = args.imageId;
    }
    if (args.imagePosition !== undefined) updates.imagePosition = args.imagePosition;
    if (args.imageCaption !== undefined) updates.imageCaption = args.imageCaption;
    if (args.fontSize !== undefined) updates.fontSize = args.fontSize;
    if (args.layout !== undefined) updates.layout = args.layout;

    await ctx.db.patch(args.blockId, updates as any);
  },
});

export const deleteBlock = mutation({
  args: { token: v.string(), blockId: v.id("handoutBlocks") },
  handler: async (ctx, args) => {
    const presenter = await requirePresenter(ctx, args.token);
    assertNotDemo(presenter);
    const block = await ctx.db.get(args.blockId);
    if (!block) throw new Error("Block nicht gefunden");

    const handout = await ctx.db.get(block.handoutId);
    if (!handout || handout.presenterId !== presenter._id) {
      throw new Error("Nicht autorisiert");
    }

    await ctx.db.delete(args.blockId);
  },
});

export const setPdfFile = mutation({
  args: {
    token: v.string(),
    handoutId: v.id("handouts"),
    pdfFileId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const presenter = await requirePresenter(ctx, args.token);
    assertNotDemo(presenter);
    const handout = await ctx.db.get(args.handoutId);
    if (!handout || handout.presenterId !== presenter._id) throw new Error("Nicht gefunden");
    if (handout.pdfFileId && args.pdfFileId !== handout.pdfFileId) {
      await ctx.storage.delete(handout.pdfFileId);
    }
    await ctx.db.patch(args.handoutId, {
      pdfFileId: args.pdfFileId,
      updatedAt: Date.now(),
    });
  },
});

export const removePdfFile = mutation({
  args: { token: v.string(), handoutId: v.id("handouts") },
  handler: async (ctx, args) => {
    const presenter = await requirePresenter(ctx, args.token);
    assertNotDemo(presenter);
    const handout = await ctx.db.get(args.handoutId);
    if (!handout || handout.presenterId !== presenter._id) throw new Error("Nicht gefunden");
    if (handout.pdfFileId) {
      await ctx.storage.delete(handout.pdfFileId);
    }
    await ctx.db.patch(args.handoutId, { pdfFileId: undefined, updatedAt: Date.now() });
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
    assertNotDemo(presenter);
    const handout = await ctx.db.get(args.handoutId);
    if (!handout || handout.presenterId !== presenter._id) {
      throw new Error("Nicht autorisiert");
    }

    for (let i = 0; i < args.blockIds.length; i++) {
      await ctx.db.patch(args.blockIds[i], { order: i, updatedAt: Date.now() });
    }
  },
});
