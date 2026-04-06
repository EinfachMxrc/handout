import { ConvexReactClient } from "convex/react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

// Use a placeholder URL when not configured so that the ConvexProvider is
// always available during server-side rendering (build time). Hooks will
// return undefined (loading state) until the client connects.
export const convexClient = new ConvexReactClient(
  convexUrl ?? "https://placeholder.convex.cloud"
);

export const isConvexConfigured = !!convexUrl;

export const CONVEX_MUTATION_TIMEOUT_MS = 30_000;
