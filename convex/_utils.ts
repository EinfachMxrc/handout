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
 * Kept for verifying legacy accounts created before PBKDF2 migration.
 * Do NOT use for new accounts — use pbkdf2Hash instead.
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
 * PBKDF2-SHA256 password hash with a random per-user salt.
 * Uses Web Crypto API available in Convex's V8 isolate.
 * Hash format: "pbkdf2_<saltHex>_<hashHex>"
 *
 * @param password  Plaintext password
 * @param saltHex   Optional 32-char hex salt (re-derive for verification); if
 *                  omitted a fresh random 16-byte salt is generated.
 */
export async function pbkdf2Hash(password: string, saltHex?: string): Promise<string> {
  const saltBytes = saltHex
    ? new Uint8Array(saltHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)))
    : crypto.getRandomValues(new Uint8Array(16));
  const saltHexOut = Array.from(saltBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: saltBytes, iterations: 100_000 },
    key,
    256
  );
  const hashHex = Array.from(new Uint8Array(bits))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `pbkdf2_${saltHexOut}_${hashHex}`;
}

/**
 * Verify a password against any stored hash format (pbkdf2_, sha256_, mvp_).
 * Returns true if the password matches.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (stored.startsWith("pbkdf2_")) {
    const parts = stored.split("_");
    if (parts.length !== 3) return false;
    const expected = await pbkdf2Hash(password, parts[1]);
    return expected === stored;
  }
  if (stored.startsWith("sha256_")) {
    return (await sha256Hash(password)) === stored;
  }
  if (stored.startsWith("mvp_")) {
    return simpleHash(password) === stored;
  }
  return false;
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
