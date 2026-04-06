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
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-amber-500 text-white text-sm text-center py-2 px-4">
          ⚠️ <strong>NEXT_PUBLIC_CONVEX_URL</strong> ist nicht gesetzt.
          Führen Sie <code className="bg-amber-600 px-1 rounded">npx convex dev</code> aus
          und tragen Sie die URL in <code className="bg-amber-600 px-1 rounded">apps/web/.env.local</code> ein.
        </div>
      )}
      {children}
    </ConvexProvider>
  );
}
