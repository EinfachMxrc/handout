/**
 * Internal utilities for Convex functions.
 * Reveal logic wrapper that bridges Convex data to reveal-engine types.
 */

import type { Doc } from "./_generated/dataModel";

export type BlockDoc = Doc<"handoutBlocks">;
export type SessionDoc = Doc<"presentationSessions">;

/** Generate a random alphanumeric token */
export function generateToken(length: number = 12): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < length; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

/** Determine block visibility server-side (mirrors reveal-engine logic) */
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
