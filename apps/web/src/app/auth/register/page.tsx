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
          () => reject(new Error("Zeitüberschreitung - bitte erneut versuchen")),
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
    <div className="page-shell flex min-h-screen items-center py-10">
      <div className="grid w-full gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="page-hero flex flex-col justify-between">
          <div>
            <span className="kicker-pill">New presenter setup</span>
            <h1 className="page-title max-w-2xl text-5xl sm:text-6xl">
              Bauen Sie sich eine eigene Arbeitsfläche für Live-Handouts auf.
            </h1>
            <p className="page-copy max-w-xl">
              Ein eigener Presenter-Account trennt Ihre Inhalte von der Demo,
              macht Sessions schreibbar und gibt Ihnen vollen Zugriff auf Editor,
              Session-Logik und PowerPoint-Integration.
            </p>
          </div>

          <div className="mt-10 grid gap-4">
            <div className="section-panel">
              <div className="metric-label">Nach dem Login</div>
              <p className="mt-3 text-base leading-7 text-stone-700">
                Sie landen direkt im Dashboard, erstellen Ihr erstes Handout und
                können daraus sofort eine Session für Publikum und Vortrag starten.
              </p>
            </div>
          </div>
        </section>

        <section className="card self-center p-8 sm:p-10">
          <div className="mb-8">
            <div className="eyebrow">Registrierung</div>
            <h2 className="mt-3 text-4xl">Presenter-Konto erstellen</h2>
            <p className="page-copy mt-2 max-w-none">
              Der Account wird für Dashboard, Session-Steuerung und das Add-in genutzt.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="name">
                Name
              </label>
              <input
                id="name"
                type="text"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ihr Name"
              />
            </div>

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
              {isLoading ? "Konto wird erstellt..." : "Konto erstellen"}
            </button>
          </form>

          <div className="mt-6 flex flex-col gap-3 text-sm text-stone-600 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Bereits registriert?{" "}
              <Link href="/auth/login" className="font-semibold text-stone-900 underline decoration-stone-300">
                Anmelden
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
