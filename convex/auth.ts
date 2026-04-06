/**
 * Presenter authentication functions.
 * Simple token-based auth for MVP.
 * Uses a basic hash approach - in production use a proper auth provider.
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { generateToken, pbkdf2Hash, verifyPassword } from "./_utils";

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

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
      throw new Error("E-Mail-Adresse bereits registriert");
    }

    const passwordHash = await pbkdf2Hash(args.password);
    const presenterId = await ctx.db.insert("presenters", {
      email: args.email,
      passwordHash,
      name: args.name,
      createdAt: Date.now(),
    });

    // Auto-login: create session token
    const token = generateToken(32);
    await ctx.db.insert("presenterSessions", {
      presenterId,
      token,
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_DURATION_MS,
    });

    return { token, presenterId };
  },
});

/** Login with email + password */
export const login = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const presenter = await ctx.db
      .query("presenters")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!presenter) {
      throw new Error("Ungültige Anmeldedaten");
    }

    // Verify against stored hash (supports pbkdf2_, sha256_, mvp_ prefixes)
    const isValid = await verifyPassword(args.password, presenter.passwordHash);
    if (!isValid) {
      throw new Error("Ungültige Anmeldedaten");
    }

    // Upgrade legacy hashes (sha256_ or mvp_) to PBKDF2 transparently
    if (!presenter.passwordHash.startsWith("pbkdf2_")) {
      await ctx.db.patch(presenter._id, {
        passwordHash: await pbkdf2Hash(args.password),
      });
    }

    const token = generateToken(32);
    await ctx.db.insert("presenterSessions", {
      presenterId: presenter._id,
      token,
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_DURATION_MS,
    });

    return { token, presenterId: presenter._id, name: presenter.name, email: presenter.email };
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
