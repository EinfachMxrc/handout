import { ConvexReactClient } from "convex/react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  console.warn(
    "NEXT_PUBLIC_CONVEX_URL is not set. Set it in .env.local after running `npx convex dev`."
  );
}

export const convexClient = new ConvexReactClient(convexUrl ?? "https://placeholder.convex.cloud");
