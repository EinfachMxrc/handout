"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@convex/_generated/api";
import { useAuthStore } from "@/store/authStore";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@convex/_utils";

export default function DemoLoginPage() {
  const login = useMutation(api.auth.login);
  const { setAuth, token } = useAuthStore();
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    // Already logged in as demo? Go straight to dashboard
    if (token) {
      router.replace("/dashboard");
      return;
    }

    let cancelled = false;

    async function autoLogin() {
      try {
        const result = await login({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
        if (cancelled) return;
        setAuth(result.token, result.name ?? undefined, result.email, result.isDemo ?? false);
        router.replace("/dashboard");
      } catch (err: any) {
        if (cancelled) return;
        setError(err.message ?? "Demo-Login fehlgeschlagen");
      }
    }

    autoLogin();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>
          <a href="/auth/login" className="btn-secondary">Zur Anmeldeseite</a>
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
