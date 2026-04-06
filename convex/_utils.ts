/**
 * Internal utilities for Convex functions.
 */

import { ConvexError } from "convex/values";
import type { Doc } from "./_generated/dataModel";

export type BlockDoc = Doc<"handoutBlocks">;
export type SessionDoc = Doc<"presentationSessions">;

export const DEMO_EMAIL = "demo@example.com";
export const DEMO_PASSWORD = "demo1234";

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
 * Do NOT use for new accounts.
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
 * SHA-256 password hash with a random per-user salt.
 * Uses only crypto.subtle.digest which is reliably available in Convex's V8 isolate.
 * Hash format: "sha256v2_<saltHex>_<hashHex>"
 *
 * @param password  Plaintext password
 * @param saltHex   Optional 32-hex-char salt for re-deriving during verification;
 *                  if omitted a fresh random 16-byte salt is generated.
 */
export async function sha256v2Hash(password: string, saltHex?: string): Promise<string> {
  const saltBytes = saltHex
    ? new Uint8Array(saltHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)))
    : crypto.getRandomValues(new Uint8Array(16));
  const saltHexOut = Array.from(saltBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const data = new TextEncoder().encode(`slide-handout-v2:${saltHexOut}:${password}`);
  const buffer = await crypto.subtle.digest("SHA-256", data);
  const hex = Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `sha256v2_${saltHexOut}_${hex}`;
}

/**
 * Verify a password against any stored hash format.
 * Supports sha256v2_ (current), sha256_ (legacy), mvp_ (legacy).
 * Returns true if the password matches.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (stored.startsWith("sha256v2_")) {
    const parts = stored.split("_");
    if (parts.length !== 3) return false;
    const expected = await sha256v2Hash(password, parts[1]);
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

export function isDemoPresenter(presenter: { isDemo?: boolean; email?: string | undefined }) {
  return presenter.isDemo === true || presenter.email === DEMO_EMAIL;
}

/**
 * Throw if the presenter is the shared demo account.
 * Call this at the top of every write mutation.
 */
export function assertNotDemo(presenter: { isDemo?: boolean; email?: string | undefined }) {
  if (isDemoPresenter(presenter)) {
    throw new ConvexError(
      "Der Demo-Account ist schreibgeschuetzt. Bitte registrieren Sie sich fuer einen eigenen Account."
    );
  }
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
export function isBlockVisible(block: BlockDoc, session: SessionDoc): boolean {
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
