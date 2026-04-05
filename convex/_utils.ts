/**
 * Internal utilities for Convex functions.
 */

import type { Doc } from "./_generated/dataModel";

export type BlockDoc = Doc<"handoutBlocks">;
export type SessionDoc = Doc<"presentationSessions">;

/**
 * Generate a cryptographically secure random alphanumeric token.
 * Uses crypto.getRandomValues (available in Convex's V8 isolate).
 */
export function generateToken(length: number = 12): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

/**
 * Simple hash for MVP auth – NOT for production use.
 * Centralised here so auth.ts and seed.ts always use the same implementation.
 *
 * NOTE: This is a 32-bit integer hash, not bcrypt. It is intentionally
 * lightweight for an MVP and must be replaced with a proper password-hashing
 * library (e.g. bcrypt via a Convex Action) before production deployment.
 */
export function simpleHash(password: string): string {
  let hash = 0;
  const salted = `slide-handout-mvp:${password}`;
  for (let i = 0; i < salted.length; i++) {
    const char = salted.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // 32-bit truncation
  }
  return `mvp_${Math.abs(hash).toString(16)}`;
}

/** Determine block visibility server-side (mirrors reveal-engine logic). */
export function isBlockVisible(
  block: BlockDoc,
  session: SessionDoc
): boolean {
  const rule = block.revealRule;

  if (rule.alwaysVisible) return true;

  if (rule.manuallyTriggered) {
    return session.manuallyTriggeredBlockIds.includes(block._id);
  }

  const effectiveSlide = rule.relockOnBack
    ? session.currentSlide
    : Math.max(session.currentSlide, session.highWaterSlide);

  if (effectiveSlide < rule.revealSlide) return false;

  if (rule.revealToSlide !== undefined && session.currentSlide > rule.revealToSlide) {
    return false;
  }

  return true;
}
