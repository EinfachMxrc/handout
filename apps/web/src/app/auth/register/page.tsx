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
        setTimeout(() => reject(new Error("Zeitüberschreitung – bitte erneut versuchen")), CONVEX_MUTATION_TIMEOUT_MS)
      );
      const result = await Promise.race([register({ email, password, name }), timeout]);
      setAuth(result.token as string, name, email);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message ?? "Registrierung fehlgeschlagen");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="card">
          <div className="text-center mb-8">
            <span className="text-4xl">📑</span>
            <h1 className="text-2xl font-bold text-gray-900 mt-2">Konto erstellen</h1>
            <p className="text-gray-600 text-sm mt-1">Presenter-Dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="name">Name</label>
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
              <label className="label" htmlFor="email">E-Mail</label>
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
              <label className="label" htmlFor="password">Passwort</label>
              <input
                id="password"
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mindestens 8 Zeichen"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full" disabled={isLoading}>
              {isLoading ? "Konto wird erstellt..." : "Konto erstellen"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600 mt-6">
            Bereits ein Konto?{" "}
            <Link href="/auth/login" className="text-blue-600 hover:underline">
              Anmelden
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
