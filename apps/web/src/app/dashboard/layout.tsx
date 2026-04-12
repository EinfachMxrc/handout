"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import Link from "next/link";
import { api } from "@convex/_generated/api";
import { useAuthStore } from "@/store/authStore";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { token, clearAuth, presenterName, presenterEmail, isDemo, setAuth } = useAuthStore();
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const presenterInfo = useQuery(api.auth.validateToken, token ? { token } : "skip");
  const logoutMutation = useMutation(api.auth.logout);

  useEffect(() => {
    if (!hydrated) return;
    if (!token) {
      router.push("/auth/login");
      return;
    }
    if (presenterInfo === null) {
      clearAuth();
      router.push("/auth/login");
    }
    if (
      token &&
      presenterInfo &&
      (presenterInfo.name !== presenterName ||
        presenterInfo.email !== presenterEmail ||
        presenterInfo.isDemo !== isDemo)
    ) {
      setAuth(token, presenterInfo.name ?? undefined, presenterInfo.email, presenterInfo.isDemo);
    }
  }, [hydrated, token, presenterInfo, presenterName, presenterEmail, isDemo, router, clearAuth, setAuth]);

  const handleLogout = async () => {
    if (token) {
      try {
        await logoutMutation({ token });
      } catch {
        // Keep local logout even if the server-side cleanup fails.
      }
    }
    clearAuth();
    router.push("/auth/login");
  };

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-300 border-t-stone-800" />
      </div>
    );
  }

  if (!token) return null;

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
              {presenterName ?? presenterEmail ?? "Presenter"}
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
