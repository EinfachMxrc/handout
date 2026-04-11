"use client";

import { ConvexProvider } from "convex/react";
import { convexClient, isConvexConfigured } from "@/lib/convex";

export function ConvexClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConvexProvider client={convexClient}>
      {!isConvexConfigured && (
        <div className="fixed inset-x-4 bottom-4 z-50 rounded-[24px] border border-amber-400/30 bg-amber-50/95 px-5 py-4 text-center text-sm text-amber-900 shadow-[0_18px_40px_rgba(114,82,29,0.18)] backdrop-blur sm:inset-x-auto sm:right-4 sm:max-w-xl">
          <strong>NEXT_PUBLIC_CONVEX_URL</strong> ist nicht gesetzt. Fuehren Sie{" "}
          <code>npx convex dev</code> aus und tragen Sie die URL in{" "}
          <code>apps/web/.env.local</code> ein.
        </div>
      )}
      {children}
    </ConvexProvider>
  );
}
