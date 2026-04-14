"use client";

import { ConvexProvider } from "convex/react";
import { usePathname } from "next/navigation";
import { ThemeProvider } from "next-themes";
import { convexClient, isConvexConfigured } from "@/lib/convex";

export function ConvexClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const disableRealtime = pathname === "/auth/demo";

  const content = (
    <>
      {!isConvexConfigured && (
        <div className="fixed inset-x-4 bottom-4 z-50 rounded-[24px] border border-amber-400/30 bg-amber-50/95 px-5 py-4 text-center text-sm text-amber-900 shadow-[0_18px_40px_rgba(114,82,29,0.18)] backdrop-blur sm:inset-x-auto sm:right-4 sm:max-w-xl">
          <strong>NEXT_PUBLIC_CONVEX_URL</strong> fehlt oder ist ein Platzhalter. Führen Sie{" "}
          <code>npx convex dev</code> aus und tragen Sie die echte URL in{" "}
          <code>apps/web/.env.local</code> ein.
        </div>
      )}
      {children}
    </>
  );

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {disableRealtime ? content : <ConvexProvider client={convexClient}>{content}</ConvexProvider>}
    </ThemeProvider>
  );
}
