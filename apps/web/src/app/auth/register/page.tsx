"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@convex/_generated/api";
import { useAuthStore } from "@/store/authStore";
import { isConvexConfigured, CONVEX_MUTATION_TIMEOUT_MS } from "@/lib/convex";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const register = useMutation(api.auth.register);
  const { setAuth } = useAuthStore();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Passwort muss mindestens 8 Zeichen haben");
      return;
    }

    if (!isConvexConfigured) {
      setError("Backend nicht konfiguriert. Bitte NEXT_PUBLIC_CONVEX_URL setzen.");
      return;
    }

    setIsLoading(true);
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Zeitüberschreitung — bitte erneut versuchen")),
          CONVEX_MUTATION_TIMEOUT_MS
        )
      );
      const result = await Promise.race([register({ email, password, name }), timeout]);
      setAuth(result.token as string, name, email, result.isDemo ?? false);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message ?? "Registrierung fehlgeschlagen");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left: Info */}
      <div className="hidden w-1/2 flex-col justify-between p-10 lg:flex" style={{ background: "var(--accent)", color: "#fff" }}>
        <Link href="/" className="text-lg font-bold">Slide Handout</Link>
        <div className="max-w-md">
          <h1 className="text-4xl font-bold leading-tight" style={{ color: "#fff" }}>
            Eigenes Konto erstellen.
          </h1>
          <p className="mt-4 text-base leading-relaxed" style={{ color: "rgba(255,255,255,0.8)" }}>
            Mit einem eigenen Account können Sie Handouts erstellen,
            Live-Sessions steuern und das PowerPoint-Add-in nutzen.
          </p>
        </div>
        <div className="rounded-lg p-4" style={{ background: "rgba(255,255,255,0.1)" }}>
          <div className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>Erst testen?</div>
          <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.8)" }}>
            Mit <code>demo@example.com</code> / <code>demo1234</code> können
            Sie alles anschauen, ohne sich zu registrieren.
          </p>
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="text-sm font-medium lg:hidden" style={{ color: "var(--accent-text)" }}>
            ← Zurück zur Startseite
          </Link>

          <h2 className="mt-6 text-2xl font-bold lg:mt-0">Konto erstellen</h2>
          <p className="mt-2 text-sm" style={{ color: "var(--ink-soft)" }}>
            Kostenlos und in unter einer Minute eingerichtet.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="label" htmlFor="name">Name</label>
              <input id="name" type="text" className="input" value={name}
                onChange={(e) => setName(e.target.value)} placeholder="Ihr Name" />
            </div>
            <div>
              <label className="label" htmlFor="email">E-Mail</label>
              <input id="email" type="email" className="input" value={email}
                onChange={(e) => setEmail(e.target.value)} placeholder="ihre@email.de" required />
            </div>
            <div>
              <label className="label" htmlFor="password">Passwort</label>
              <input id="password" type="password" className="input" value={password}
                onChange={(e) => setPassword(e.target.value)} placeholder="Mindestens 8 Zeichen" required />
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300">
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full" disabled={isLoading}>
              {isLoading ? "Konto wird erstellt…" : "Konto erstellen"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm" style={{ color: "var(--ink-muted)" }}>
            Bereits registriert?{" "}
            <Link href="/auth/login" className="font-medium" style={{ color: "var(--accent-text)" }}>
              Anmelden
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
