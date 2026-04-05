import { ConvexReactClient } from "convex/react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

// Don't create a client if no URL is configured – avoids the
// "Couldn't parse deployment name placeholder" fatal error.
export const convexClient = convexUrl
  ? new ConvexReactClient(convexUrl)
  : null;

export const isConvexConfigured = !!convexUrl;
