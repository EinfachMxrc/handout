"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { setServerSessionCookie } from "@/lib/authSession";

export default function DemoLoginPage() {
  const { setAuth, token } = useAuthStore();
  const router = useRouter();
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // Already logged in as demo? Go straight to dashboard
    if (token) {
      void setServerSessionCookie(token)
        .finally(() => {
          router.replace("/dashboard");
        });
      return;
    }

    let cancelled = false;

    async function autoLogin() {
      try {
        const response = await fetch("/api/auth/demo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        const body = (await response.json()) as {
          error?: string;
          token?: string;
          name?: string;
          email?: string;
          isDemo?: boolean;
        };

        if (!response.ok || !body.token || !body.email) {
          throw new Error(body.error ?? "Demo-Login fehlgeschlagen");
        }

        if (cancelled) return;
        setAuth(body.token, body.name ?? undefined, body.email, body.isDemo ?? true);
        router.replace("/dashboard");
      } catch (err: unknown) {
        if (cancelled) return;
        const rawMessage = err instanceof Error ? err.message : "";
        const message = rawMessage.trim() || "Demo-Login fehlgeschlagen";
        // Strip Convex internal prefixes for a cleaner user-facing message
        setError(
          message.includes("Ungueltige Anmeldedaten")
            ? "Demo-Login fehlgeschlagen. Bitte versuchen Sie es erneut."
            : message.replace(/^\[.*?\]\s*/g, "")
        );
      }
    }

    autoLogin();
    return () => { cancelled = true; };
  }, [attempt, router, setAuth, token]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-lg font-semibold">Demo-Login fehlgeschlagen</p>
          <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => { setError(""); setAttempt((a) => a + 1); }}
              className="btn-primary"
            >
              Erneut versuchen
            </button>
            <a href="/auth/login" className="btn-secondary">Zur Anmeldeseite</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-3">
        <div className="text-lg font-semibold">Demo wird geladen...</div>
        <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
          Sie werden automatisch angemeldet.
        </p>
      </div>
    </div>
  );
}
