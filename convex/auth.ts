/**
 * Presenter authentication functions.
 * Simple token-based auth for MVP.
 * Uses a basic hash approach - in production use a proper auth provider.
 */

import type { Doc } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import {
  DEMO_PASSWORD,
  generateToken,
  isDemoPresenter,
  sha256v2Hash,
  verifyPassword,
} from "./_utils";

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

async function syncDemoPresenter(
  ctx: Pick<MutationCtx, "db">,
  presenter: Doc<"presenters">,
  password: string
): Promise<Doc<"presenters">> {
  if (!isDemoPresenter(presenter)) {
    return presenter;
  }

  const updates: Partial<Pick<Doc<"presenters">, "isDemo" | "passwordHash">> = {};

  if (!presenter.isDemo) {
    updates.isDemo = true;
  }

  if (password === DEMO_PASSWORD && !presenter.passwordHash.startsWith("sha256v2_")) {
    updates.passwordHash = await sha256v2Hash(password);
  }

  if (Object.keys(updates).length === 0) {
    return presenter;
  }

  await ctx.db.patch(presenter._id, updates);
  return { ...presenter, ...updates };
}

/** Register a new presenter account */
export const register = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("presenters")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      throw new ConvexError("E-Mail-Adresse bereits registriert");
    }

    const passwordHash = await sha256v2Hash(args.password);
    const presenterId = await ctx.db.insert("presenters", {
      email: args.email,
      passwordHash,
      name: args.name,
      createdAt: Date.now(),
    });

    const token = generateToken(32);
    await ctx.db.insert("presenterSessions", {
      presenterId,
      token,
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_DURATION_MS,
    });

    return { token, presenterId, isDemo: false };
  },
});

/** Login with email + password */
export const login = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    let presenter = await ctx.db
      .query("presenters")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!presenter) {
      throw new ConvexError("Ungueltige Anmeldedaten");
    }

    presenter = await syncDemoPresenter(ctx, presenter, args.password);

    const isValid = await verifyPassword(args.password, presenter.passwordHash);
    if (!isValid) {
      throw new ConvexError("Ungueltige Anmeldedaten");
    }

    if (!presenter.passwordHash.startsWith("sha256v2_")) {
      const passwordHash = await sha256v2Hash(args.password);
      await ctx.db.patch(presenter._id, { passwordHash });
      presenter = { ...presenter, passwordHash };
    }

    const token = generateToken(32);
    await ctx.db.insert("presenterSessions", {
      presenterId: presenter._id,
      token,
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_DURATION_MS,
    });

    return {
      token,
      presenterId: presenter._id,
      name: presenter.name,
      email: presenter.email,
      isDemo: isDemoPresenter(presenter),
    };
  },
});

/** Validate a token and return presenter info */
export const validateToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("presenterSessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session) return null;
    if (session.expiresAt < Date.now()) return null;

    const presenter = await ctx.db.get(session.presenterId);
    if (!presenter) return null;

    return {
      presenterId: presenter._id,
      email: presenter.email,
      name: presenter.name,
      isDemo: isDemoPresenter(presenter),
    };
  },
});

/** Logout: delete session token */
export const logout = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("presenterSessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (session) {
      await ctx.db.delete(session._id);
    }
  },
});
