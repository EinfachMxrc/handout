/**
 * Viewer tracking: Zuschauer senden alle 30s einen Heartbeat.
 * Der Presenter sieht die Anzahl aktiver Zuschauer in Echtzeit.
 */

import { internalMutation, mutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { v } from "convex/values";

/** Fenster in ms, in dem ein Zuschauer als "aktiv" gilt */
const ACTIVE_WINDOW_MS = 90_000; // 90 Sekunden

// ---- AUTH HELPER ----
async function requirePresenter(ctx: Pick<QueryCtx, "db">, token: string) {
  const session = await ctx.db
    .query("presenterSessions")
    .withIndex("by_token", (q) => q.eq("token", token))
    .first();
  if (!session || session.expiresAt < Date.now()) throw new Error("Nicht autorisiert");
  const presenter = await ctx.db.get(session.presenterId);
  if (!presenter) throw new Error("Nicht autorisiert");
  return presenter;
}

/**
 * PUBLIC: Zuschauer-Heartbeat senden.
 * Wird von der öffentlichen Handout-Seite alle 30s aufgerufen.
 */
export const pingViewer = mutation({
  args: {
    publicToken: v.string(),
    viewerId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("presentationSessions")
      .withIndex("by_public_token", (q) => q.eq("publicToken", args.publicToken))
      .first();

    if (!session || session.status === "ended") return;

    const existing = await ctx.db
      .query("viewerHeartbeats")
      .withIndex("by_session_viewer", (q) =>
        q.eq("sessionId", session._id).eq("viewerId", args.viewerId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { lastSeenAt: Date.now() });
    } else {
      await ctx.db.insert("viewerHeartbeats", {
        sessionId: session._id,
        viewerId: args.viewerId,
        lastSeenAt: Date.now(),
      });
    }
  },
});

/**
 * PRESENTER: Anzahl aktiver Zuschauer für eine Session abfragen.
 */
export const getViewerCount = query({
  args: {
    token: v.string(),
    sessionId: v.id("presentationSessions"),
  },
  handler: async (ctx, args) => {
    await requirePresenter(ctx, args.token);

    const cutoff = Date.now() - ACTIVE_WINDOW_MS;
    const heartbeats = await ctx.db
      .query("viewerHeartbeats")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    return heartbeats.filter((h) => h.lastSeenAt > cutoff).length;
  },
});

/**
 * INTERNAL: Alte Heartbeats aufräumen (wird stündlich per Cron aufgerufen).
 */
export const cleanupHeartbeats = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 24 * 60 * 60_000; // älter als 24h
    const old = await ctx.db.query("viewerHeartbeats").collect();
    let deleted = 0;
    for (const h of old) {
      if (h.lastSeenAt < cutoff) {
        await ctx.db.delete(h._id);
        deleted++;
      }
    }
    return { deleted };
  },
});
