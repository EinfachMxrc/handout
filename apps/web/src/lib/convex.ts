import { ConvexReactClient } from "convex/react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();

function isLikelyPlaceholder(url: string): boolean {
  return /(your-deployment|placeholder|example)/i.test(url);
}

function isValidConvexCloudUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const isHttps = parsed.protocol === "https:";
    const isConvexHost = parsed.hostname.endsWith(".convex.cloud");
    return isHttps && isConvexHost && !isLikelyPlaceholder(url);
  } catch {
    return false;
  }
}

const hasValidConvexUrl = !!convexUrl && isValidConvexCloudUrl(convexUrl);

// Use a placeholder URL when not configured so that the ConvexProvider is
// always available during server-side rendering (build time). Hooks will
// return undefined (loading state) until the client connects.
export const convexClient = new ConvexReactClient(
  hasValidConvexUrl ? convexUrl : "https://gentle-otter-123.convex.cloud"
);

export const isConvexConfigured = hasValidConvexUrl;

export const CONVEX_MUTATION_TIMEOUT_MS = 30_000;
