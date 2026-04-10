"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "@convex/_generated/dataModel";
import { api } from "@convex/_generated/api";
import {
  destroyOfficeBridge,
  initOfficeBridge,
  isOfficeAvailable,
  type SyncCapability,
} from "@/lib/powerpoint/officeBridge";

const STORAGE_KEY = "slide-handout-powerpoint-addin";

type SessionOption = {
  _id: Id<"presentationSessions">;
  currentSlide: number;
  createdAt: number;
  publicToken: string;
  status: "draft" | "live" | "ended";
  totalSlides?: number;
};

type PersistedState = {
  presenterEmail: string;
  presenterName: string;
  selectedSessionId: string;
  token: string;
};

const statusLabel: Record<SessionOption["status"], string> = {
  draft: "Entwurf",
  live: "Live",
  ended: "Beendet",
};

const syncBadgeClasses: Record<SyncCapability, string> = {
  auto: "border-emerald-200 bg-emerald-50 text-emerald-700",
  hybrid: "border-amber-200 bg-amber-50 text-amber-700",
  manual_only: "border-slate-200 bg-slate-50 text-slate-700",
};

function emptyPersistedState(): PersistedState {
  return {
    token: "",
    presenterEmail: "",
    presenterName: "",
    selectedSessionId: "",
  };
}

function loadPersistedState(): PersistedState {
  if (typeof window === "undefined") {
    return emptyPersistedState();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return emptyPersistedState();
    }

    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return {
      token: parsed.token ?? "",
      presenterEmail: parsed.presenterEmail ?? "",
      presenterName: parsed.presenterName ?? "",
      selectedSessionId: parsed.selectedSessionId ?? "",
    };
  } catch {
    return emptyPersistedState();
  }
}

function getErrorMessage(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object") {
    if ("data" in error && typeof error.data === "string") {
      return error.data;
    }

    if ("message" in error && typeof error.message === "string") {
      return error.message;
    }
  }

  return "Es ist ein unbekannter Fehler aufgetreten.";
}

export function PowerPointAddinClient() {
  const [hydrated, setHydrated] = useState(false);
  const [token, setToken] = useState("");
  const [presenterEmail, setPresenterEmail] = useState("");
  const [presenterName, setPresenterName] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginPending, setLoginPending] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncCapability>("manual_only");
  const [bridgeSlide, setBridgeSlide] = useState<number | null>(null);
  const [slideInput, setSlideInput] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [officeDetected, setOfficeDetected] = useState(false);

  const login = useMutation(api.auth.login);
  const logout = useMutation(api.auth.logout);
  const startSession = useMutation(api.sessions.startSession);
  const stopSession = useMutation(api.sessions.stopSession);
  const setCurrentSlide = useMutation(api.sessions.setCurrentSlide);

  useEffect(() => {
    const persisted = loadPersistedState();
    setToken(persisted.token);
    setPresenterEmail(persisted.presenterEmail);
    setPresenterName(persisted.presenterName);
    setSelectedSessionId(persisted.selectedSessionId);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        token,
        presenterEmail,
        presenterName,
        selectedSessionId,
      } satisfies PersistedState)
    );
  }, [hydrated, token, presenterEmail, presenterName, selectedSessionId]);

  const presenter = useQuery(api.auth.validateToken, token ? { token } : "skip");
  const hasValidatedPresenter = presenter !== undefined && presenter !== null;
  const sessions = useQuery(
    api.sessions.listSessions,
    token && hasValidatedPresenter ? { token } : "skip"
  ) as SessionOption[] | undefined;
  const sessionData = useQuery(
    api.sessions.getPresenterSessionState,
    token && hasValidatedPresenter && selectedSessionId
      ? {
          token,
          sessionId: selectedSessionId as Id<"presentationSessions">,
        }
      : "skip"
  );

  const isDemo = presenter?.isDemo ?? false;

  useEffect(() => {
    if (!token || presenter === undefined) {
      return;
    }

    if (presenter === null) {
      setToken("");
      setPresenterEmail("");
      setPresenterName("");
      setSelectedSessionId("");
      setLoginError("Die gespeicherte Sitzung ist abgelaufen. Bitte erneut anmelden.");
      return;
    }

    setPresenterEmail(presenter.email);
    setPresenterName(presenter.name ?? "");
  }, [presenter, token]);

  useEffect(() => {
    if (!sessions) {
      return;
    }

    const selectedStillExists = sessions.some(
      (session) => session._id === selectedSessionId
    );
    if (selectedStillExists) {
      return;
    }

    const preferredSession =
      sessions.find((session) => session.status === "live") ??
      sessions.find((session) => session.status === "draft") ??
      sessions[0];

    setSelectedSessionId(preferredSession?._id ?? "");
  }, [sessions, selectedSessionId]);

  // Reset bridge slide when switching sessions so the DB value shows until
  // the bridge detects the current slide again.
  useEffect(() => {
    setBridgeSlide(null);
  }, [selectedSessionId]);

  // Bridge slide takes priority over DB value to avoid overwriting a detected
  // slide change before the Convex mutation completes.
  const lastKnownSlide = bridgeSlide ?? sessionData?.session.currentSlide ?? 1;

  const sessionOptions = useMemo(
    () =>
      (sessions ?? []).map((session) => ({
        ...session,
        label: `Session - ${statusLabel[session.status]} - ${new Date(
          session.createdAt
        ).toLocaleDateString("de-DE")}`,
      })),
    [sessions]
  );

  const syncSlide = async (
    slideNumber: number,
    totalSlides?: number,
    presentationTitle?: string
  ) => {
    if (!token || !selectedSessionId || isDemo) {
      return;
    }

    setIsSyncing(true);
    setActionError(null);

    try {
      await setCurrentSlide({
        token,
        sessionId: selectedSessionId as Id<"presentationSessions">,
        slideNumber,
        totalSlides,
        presentationTitle,
      });
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const officeAvailable = isOfficeAvailable();
    setOfficeDetected(officeAvailable);
    setSyncStatus("manual_only");

    if (!officeAvailable || !token || !selectedSessionId || isDemo) {
      return;
    }

    let active = true;

    void initOfficeBridge({
      onSlideChange: (info) => {
        if (!active) {
          return;
        }

        setBridgeSlide(info.slideNumber);
        void syncSlide(
          info.slideNumber,
          info.totalSlides,
          info.presentationTitle
        );
      },
      onModeChange: (mode) => {
        if (!active) {
          return;
        }

        setSyncStatus(mode);
      },
      onError: (message) => {
        if (!active) {
          return;
        }

        setActionError(message);
        setSyncStatus("hybrid");
      },
    }).then((mode) => {
      if (active) {
        setSyncStatus(mode);
      }
    });

    return () => {
      active = false;
      destroyOfficeBridge();
    };
  }, [token, selectedSessionId, isDemo, setCurrentSlide]);

  const handleManualSlide = async (nextSlide: number) => {
    const normalizedSlide = Math.max(1, nextSlide);
    setBridgeSlide(normalizedSlide);
    await syncSlide(
      normalizedSlide,
      sessionData?.session.totalSlides,
      sessionData?.session.presentationTitle
    );
  };

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginPending(true);
    setLoginError(null);
    setActionError(null);

    try {
      const result = await login({
        email: loginEmail.trim(),
        password: loginPassword,
      });

      setToken(result.token);
      setPresenterEmail(result.email ?? loginEmail.trim());
      setPresenterName(result.name ?? "");
      setLoginPassword("");
    } catch (error) {
      setLoginError(getErrorMessage(error));
    } finally {
      setLoginPending(false);
    }
  };

  const handleLogout = async () => {
    const currentToken = token;
    setToken("");
    setPresenterEmail("");
    setPresenterName("");
    setSelectedSessionId("");
    setLoginError(null);
    setActionError(null);

    if (!currentToken) {
      return;
    }

    try {
      await logout({ token: currentToken });
    } catch {
      // Session cleanup on the server is best effort only.
    }
  };

  const handleStartSession = async () => {
    if (!token || !selectedSessionId || isDemo) {
      return;
    }

    setActionError(null);

    try {
      await startSession({
        token,
        sessionId: selectedSessionId as Id<"presentationSessions">,
      });
    } catch (error) {
      setActionError(getErrorMessage(error));
    }
  };

  const handleStopSession = async () => {
    if (!token || !selectedSessionId || isDemo) {
      return;
    }

    setActionError(null);

    try {
      await stopSession({
        token,
        sessionId: selectedSessionId as Id<"presentationSessions">,
      });
    } catch (error) {
      setActionError(getErrorMessage(error));
    }
  };

  const publicUrl = sessionData
    ? `${
        typeof window !== "undefined" ? window.location.origin : ""
      }${sessionData.publicUrl}`
    : "";

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto flex min-h-screen max-w-md flex-col gap-4 p-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                PowerPoint Add-in
              </p>
              <h1 className="mt-1 text-xl font-semibold text-slate-950">
                Slide Handout
              </h1>
            </div>
            <Link href="/powerpoint" className="btn-secondary px-3 py-1.5 text-xs">
              Install-Guide
            </Link>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">
                Verbindung
              </div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {token ? "Angemeldet" : "Nicht angemeldet"}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">
                PowerPoint
              </div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {officeDetected ? "Erkannt" : "Browser-Modus"}
              </div>
            </div>
          </div>
        </div>

        {!hydrated ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
            Lade Add-in...
          </div>
        ) : !token ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-900">
              Mit Presenter-Account anmelden
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Verwenden Sie dieselben Zugangsdaten wie im Web-Dashboard.
            </p>
            <form className="mt-4 space-y-3" onSubmit={handleLogin}>
              <div>
                <label className="label">E-Mail</label>
                <input
                  className="input"
                  type="email"
                  autoComplete="username"
                  value={loginEmail}
                  onChange={(event) => setLoginEmail(event.target.value)}
                  placeholder="name@example.com"
                  required
                />
              </div>
              <div>
                <label className="label">Passwort</label>
                <input
                  className="input"
                  type="password"
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                  placeholder="Ihr Passwort"
                  required
                />
              </div>
              {loginError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {loginError}
                </div>
              )}
              <button className="btn-primary w-full" type="submit" disabled={loginPending}>
                {loginPending ? "Anmeldung laeuft..." : "Anmelden"}
              </button>
            </form>
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Presenter verbunden
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {presenterName || presenterEmail}
                  </p>
                </div>
                <button className="btn-secondary px-3 py-1.5 text-xs" onClick={handleLogout}>
                  Abmelden
                </button>
              </div>

              {isDemo && (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Demo-Modus erkannt. Schreibende Steuerung bleibt aus Sicherheitsgruenden gesperrt.
                </div>
              )}

              <div className="mt-4">
                <label className="label">Session</label>
                <select
                  className="input"
                  value={selectedSessionId}
                  onChange={(event) => setSelectedSessionId(event.target.value)}
                >
                  <option value="">
                    {sessions === undefined
                      ? "Sessions werden geladen..."
                      : sessions.length === 0
                      ? "Keine Sessions vorhanden"
                      : "Session auswaehlen"}
                  </option>
                  {sessionOptions.map((session) => (
                    <option key={session._id} value={session._id}>
                      {session.label}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-slate-500">
                  Falls hier nichts auftaucht, erstellen Sie zuerst im Dashboard eine Session.
                </p>
              </div>
            </div>

            {selectedSessionId && sessionData && (
              <>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Aktive Session
                      </p>
                      <h2 className="mt-1 text-lg font-semibold text-slate-950">
                        {sessionData.handout?.title ?? "Ohne Titel"}
                      </h2>
                      <p className="mt-1 text-sm text-slate-600">
                        Status: {statusLabel[sessionData.session.status]}
                      </p>
                    </div>
                    <div
                      className={`rounded-full border px-3 py-1 text-xs font-medium ${syncBadgeClasses[syncStatus]}`}
                    >
                      {syncStatus === "auto"
                        ? "Auto-Sync"
                        : syncStatus === "hybrid"
                        ? "Hybrid"
                        : officeDetected
                        ? "Manuell"
                        : "Browser"}
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    {sessionData.session.status === "draft" ? (
                      <button
                        className="btn-primary flex-1"
                        onClick={handleStartSession}
                        disabled={isDemo}
                      >
                        Session starten
                      </button>
                    ) : sessionData.session.status === "live" ? (
                      <button
                        className="btn-danger flex-1"
                        onClick={handleStopSession}
                        disabled={isDemo}
                      >
                        Session beenden
                      </button>
                    ) : (
                      <div className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-sm text-slate-600">
                        Diese Session ist bereits beendet.
                      </div>
                    )}
                    {publicUrl && (
                      <a
                        href={publicUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary"
                      >
                        Handout
                      </a>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-center">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Aktuelle Folie
                    </p>
                    <div className="mt-2 text-5xl font-semibold tracking-tight text-slate-950">
                      {lastKnownSlide}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {sessionData.session.totalSlides
                        ? `von ${sessionData.session.totalSlides} Folien`
                        : "ohne bekannte Gesamtzahl"}
                    </p>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      className="btn-secondary"
                      onClick={() => void handleManualSlide(lastKnownSlide - 1)}
                      disabled={isDemo || isSyncing}
                    >
                      Zurueck
                    </button>
                    <button
                      className="btn-primary"
                      onClick={() => void handleManualSlide(lastKnownSlide + 1)}
                      disabled={isDemo || isSyncing}
                    >
                      Weiter
                    </button>
                  </div>

                  <form
                    className="mt-3 flex gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const parsed = Number.parseInt(slideInput, 10);
                      if (Number.isNaN(parsed)) {
                        return;
                      }

                      setSlideInput("");
                      void handleManualSlide(parsed);
                    }}
                  >
                    <input
                      className="input"
                      type="number"
                      min={1}
                      value={slideInput}
                      onChange={(event) => setSlideInput(event.target.value)}
                      placeholder="Folie direkt setzen"
                    />
                    <button
                      className="btn-secondary whitespace-nowrap"
                      type="submit"
                      disabled={isDemo || isSyncing}
                    >
                      Setzen
                    </button>
                  </form>

                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    {officeDetected
                      ? "Wenn PowerPoint Folienwechsel meldet, synchronisiert das Add-in automatisch. Die Tasten hier bleiben als Fallback aktiv."
                      : "Im Browser koennen Sie den Ablauf ohne PowerPoint testen. Auto-Sync ist dort nicht verfuegbar."}
                  </div>
                </div>
              </>
            )}

            {selectedSessionId && !sessionData && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                Session wird geladen...
              </div>
            )}

            {!selectedSessionId && sessions !== undefined && sessions.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                Noch keine Session vorhanden. Erstellen Sie im{" "}
                <Link href="/dashboard" className="font-medium text-blue-600 hover:underline">
                  Dashboard
                </Link>{" "}
                ein Handout und starten Sie daraus eine Session.
              </div>
            )}
          </>
        )}

        {actionError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {actionError}
          </div>
        )}
      </div>
    </div>
  );
}
