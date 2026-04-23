/**
 * Viewer tracking: Zuschauer senden alle 30s einen Heartbeat.
 * Der Presenter sieht die Anzahl aktiver Zuschauer in Echtzeit.
 */

import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";

/** Fenster in ms, in dem ein Zuschauer als "aktiv" gilt */
const ACTIVE_WINDOW_MS = 90_000; // 90 Sekunden

/**
 * Hash a raw viewerId to a fixed-size fingerprint stored in the DB index.
 * Prevents unbounded/arbitrary strings from being written into the index.
 */
async function fingerprintViewerId(viewerId: string): Promise<string> {
  const data = new TextEncoder().encode(`vh:${viewerId}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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

    const viewerKey = await fingerprintViewerId(args.viewerId);

    const existing = await ctx.db
      .query("viewerHeartbeats")
      .withIndex("by_session_viewer", (q) =>
        q.eq("sessionId", session._id).eq("viewerId", viewerKey)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { lastSeenAt: Date.now() });
    } else {
      await ctx.db.insert("viewerHeartbeats", {
        sessionId: session._id,
        viewerId: viewerKey,
        lastSeenAt: Date.now(),
      });
    }
  },
});

/**
 * PRESENTER: Anzahl aktiver Zuschauer für eine Session abfragen.
 *
 * Returniert 0 bei jeglichem Auth- oder Daten-Problem statt zu werfen, damit
 * die UI (useQuery) nicht in einen Error-State kippt. ConvexError-Propagation
 * in Queries umgeht Handler-try/catch in der aktuellen Convex-Version.
 */
export const getViewerCount = query({
  args: {
    token: v.string(),
    sessionId: v.id("presentationSessions"),
  },
  handler: async (ctx, args) => {
    if (!args.token) return 0;

    const presenterSession = await ctx.db
      .query("presenterSessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!presenterSession || presenterSession.expiresAt < Date.now()) return 0;

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.presenterId !== presenterSession.presenterId) return 0;

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
    const old = await ctx.db
      .query("viewerHeartbeats")
      .withIndex("by_lastSeenAt", (q) => q.lt("lastSeenAt", cutoff))
      .collect();
    let deleted = 0;
    for (const h of old) {
      await ctx.db.delete(h._id);
      deleted++;
    }
    return { deleted };
  },
});
