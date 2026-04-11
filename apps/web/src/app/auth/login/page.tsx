"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@convex/_generated/api";
import { useAuthStore } from "@/store/authStore";
import { isConvexConfigured, CONVEX_MUTATION_TIMEOUT_MS } from "@/lib/convex";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const login = useMutation(api.auth.login);
  const { setAuth } = useAuthStore();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isConvexConfigured) {
      setError("Backend nicht konfiguriert. Bitte NEXT_PUBLIC_CONVEX_URL setzen.");
      return;
    }

    setIsLoading(true);

    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Zeitueberschreitung - bitte erneut versuchen")),
          CONVEX_MUTATION_TIMEOUT_MS
        )
      );
      const result = await Promise.race([login({ email, password }), timeout]);
      setAuth(result.token, result.name ?? undefined, result.email, result.isDemo ?? false);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message ?? "Anmeldung fehlgeschlagen");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-shell flex min-h-screen items-center py-10">
      <div className="grid w-full gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="page-hero flex flex-col justify-between">
          <div>
            <span className="kicker-pill">Presenter access</span>
            <h1 className="page-title max-w-2xl text-5xl sm:text-6xl">
              Melden Sie sich an und fuehren Sie das Publikum strukturiert durch den Vortrag.
            </h1>
            <p className="page-copy max-w-xl">
              Das Dashboard, die Session-Steuerung und das PowerPoint-Add-in
              teilen sich denselben Presenter-Login. Nach dem Sign-in landen Sie
              direkt in Ihrer Arbeitsflaeche.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <div className="metric-card">
              <div className="metric-label">Demo</div>
              <div className="mt-3 text-base font-semibold">demo@example.com</div>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                Demo-Zugang fuer einen schnellen Blick auf den Reader und die Session-Oberflaechen.
              </p>
            </div>
            <div className="metric-card">
              <div className="metric-label">Sicherheit</div>
              <div className="mt-3 text-base font-semibold">Demo bleibt read-only</div>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                Der gemeinsame Demo-Account kann keine Inhalte veraendern oder Live-Logik manipulieren.
              </p>
            </div>
          </div>
        </section>

        <section className="card self-center p-8 sm:p-10">
          <div className="mb-8">
            <div className="eyebrow">Anmeldung</div>
            <h2 className="mt-3 text-4xl">Presenter-Dashboard</h2>
            <p className="page-copy mt-2 max-w-none">
              Nutzen Sie denselben Zugang fuer Dashboard, Session-Steuerung und Add-in.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="email">
                E-Mail
              </label>
              <input
                id="email"
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ihre@email.de"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="label" htmlFor="password">
                Passwort
              </label>
              <input
                id="password"
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="mindestens 8 Zeichen"
                required
              />
            </div>

            {error && (
              <div className="rounded-[22px] border border-red-300/40 bg-red-50/90 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full" disabled={isLoading}>
              {isLoading ? "Wird angemeldet..." : "Anmelden"}
            </button>
          </form>

          <div className="mt-6 flex flex-col gap-3 text-sm text-stone-600 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Noch kein Konto?{" "}
              <Link href="/auth/register" className="font-semibold text-stone-900 underline decoration-stone-300">
                Registrieren
              </Link>
            </span>
            <Link href="/" className="text-stone-500 underline decoration-stone-300">
              Zur Startseite
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
