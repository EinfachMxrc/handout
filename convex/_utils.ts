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
 * SHA-256 password hash using the Web Crypto API.
 * Available in Convex's V8 isolate. Replaces simpleHash for new accounts.
 * Hash format: "sha256_<hex>"
 */
export async function sha256Hash(password: string): Promise<string> {
  const salted = `slide-handout:${password}`;
  const data = new TextEncoder().encode(salted);
  const buffer = await crypto.subtle.digest("SHA-256", data);
  const hex = Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `sha256_${hex}`;
}

/**
 * Legacy 32-bit hash (MVP only). Kept for migration: existing accounts
 * that still have an mvp_-prefixed hash are upgraded to SHA-256 on next login.
 * Do NOT use for new accounts.
 */
export function simpleHash(password: string): string {
  let hash = 0;
  const salted = `slide-handout-mvp:${password}`;
  for (let i = 0; i < salted.length; i++) {
    const char = salted.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
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
