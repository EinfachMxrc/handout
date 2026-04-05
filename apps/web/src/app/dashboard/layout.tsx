"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "../../../convex/_generated/api";
import { useAuthStore } from "@/store/authStore";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { token, clearAuth, presenterName, presenterEmail } = useAuthStore();
  const router = useRouter();

  const presenterInfo = useQuery(api.auth.validateToken, token ? { token } : "skip");

  useEffect(() => {
    if (!token) {
      router.push("/auth/login");
      return;
    }
    // If token is invalid (null result), redirect to login
    if (presenterInfo === null) {
      clearAuth();
      router.push("/auth/login");
    }
  }, [token, presenterInfo, router, clearAuth]);

  const handleLogout = () => {
    clearAuth();
    router.push("/auth/login");
  };

  if (!token) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top navigation */}
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
