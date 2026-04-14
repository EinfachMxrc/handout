"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useAuthStore } from "@/store/authStore";
import { clearServerSessionCookie } from "@/lib/authSession";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { token, clearAuth, presenterName, presenterEmail, isDemo } = useAuthStore();
  const router = useRouter();
  const logoutMutation = useMutation(api.auth.logout);

  const handleLogout = async () => {
    const currentToken = token;

    if (currentToken) {
      try {
        await logoutMutation({ token: currentToken });
      } catch {
        // Keep local logout even if the server-side cleanup fails.
      }
    }

    await clearServerSessionCookie();
    clearAuth();
    router.replace("/auth/login");
  };

  const displayPresenter = presenterName ?? presenterEmail ?? "Presenter";

  return (
    <div className="pb-12 pt-6">
      <div className="page-shell">
        <div className="card sticky top-4 z-40 mb-6 flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="inline-flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-stone-800/10 bg-white/75 text-lg">
                SH
              </span>
              <div>
                <div className="eyebrow">Workspace</div>
                <div className="text-lg font-semibold text-stone-900">Slide Handout</div>
              </div>
            </Link>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/" className="btn-secondary">
              Landing
            </Link>
            <div className="rounded-full border border-stone-800/10 bg-white/70 px-4 py-2 text-sm text-stone-700">
              {displayPresenter}
            </div>
            <button onClick={handleLogout} className="btn-secondary">
              Abmelden
            </button>
          </div>
        </div>

        {isDemo && (
          <div className="soft-note mb-6">
            Demo-Modus: Dieser Account ist absichtlich schreibgeschützt. Sie
            können Demo-Daten ansehen, aber keine Handouts, Sessions oder
            Freischaltungen verändern.
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
