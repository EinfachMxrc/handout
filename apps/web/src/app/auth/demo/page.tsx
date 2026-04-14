"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@convex/_generated/api";
import { useAuthStore } from "@/store/authStore";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@convex/_utils";
import { setServerSessionCookie } from "@/lib/authSession";

export default function DemoLoginPage() {
  const login = useMutation(api.auth.login);
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
        const result = await login({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
        if (cancelled) return;
        setAuth(result.token, result.name ?? undefined, result.email, result.isDemo ?? false);
        await setServerSessionCookie(result.token);
        router.replace("/dashboard");
      } catch (err: unknown) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Demo-Login fehlgeschlagen";
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
  }, [attempt, login, router, setAuth, token]);

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
