"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import Link from "next/link";
import { api } from "@convex/_generated/api";
import { useAuthStore } from "@/store/authStore";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { token, clearAuth, presenterName, presenterEmail, isDemo, setAuth } = useAuthStore();
  const router = useRouter();

  const presenterInfo = useQuery(api.auth.validateToken, token ? { token } : "skip");
  const logoutMutation = useMutation(api.auth.logout);

  useEffect(() => {
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
  }, [token, presenterInfo, presenterName, presenterEmail, isDemo, router, clearAuth, setAuth]);

  const handleLogout = async () => {
    // Revoke the token server-side before clearing local state
    if (token) {
      try {
        await logoutMutation({ token });
      } catch {
        // Continue with local logout even if server call fails
      }
    }
    clearAuth();
    router.push("/auth/login");
  };

  if (!token) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Link href="/dashboard" className="flex items-center gap-2 text-gray-900 font-semibold">
              <span>📑</span>
              <span>Slide Handout</span>
            </Link>

            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 hidden sm:block">
                {presenterName ?? presenterEmail ?? "Presenter"}
              </span>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Abmelden
              </button>
            </div>
          </div>
        </div>
      </nav>

      {isDemo && (
        <div className="border-b border-amber-200 bg-amber-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 text-sm text-amber-900">
            Demo-Modus: Dieser Account ist absichtlich schreibgeschuetzt. Sie koennen vorhandene Demo-Daten ansehen, aber keine Handouts, Sessions oder Freischaltungen veraendern.
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
