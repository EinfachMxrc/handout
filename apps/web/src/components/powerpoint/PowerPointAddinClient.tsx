"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "@convex/_generated/dataModel";
import { api } from "@convex/_generated/api";
import {
  destroyOfficeBridge,
  initOfficeBridge,
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
  const storage = globalThis.localStorage;
  if (!storage) {
    return emptyPersistedState();
  }

  try {
    const raw = storage.getItem(STORAGE_KEY);
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

function persistState(state: PersistedState): void {
  const storage = globalThis.localStorage;
  if (!storage) return;
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getClientOrigin(): string {
  return globalThis.location?.origin ?? "";
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

function useAddinAuthSessionSync() {
  const [hydrated, setHydrated] = useState(false);
  const [token, setToken] = useState("");
  const [presenterEmail, setPresenterEmail] = useState("");
  const [presenterName, setPresenterName] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    const persisted = loadPersistedState();
    setToken(persisted.token);
    setPresenterEmail(persisted.presenterEmail);
    setPresenterName(persisted.presenterName);
    setSelectedSessionId(persisted.selectedSessionId);
    setHydrated(true);
  }, []);

  const presenter = useQuery(api.auth.validateToken, token ? { token } : "skip");
  const hasValidatedPresenter = presenter !== undefined && presenter !== null;
  const sessions = useQuery(
    api.sessions.listSessions,
    token && hasValidatedPresenter ? { token } : "skip"
  ) as SessionOption[] | undefined;

  const effectiveSelectedSessionId = useMemo(() => {
    if (!sessions || sessions.length === 0) {
      return "";
    }

    if (selectedSessionId && sessions.some((session) => session._id === selectedSessionId)) {
      return selectedSessionId;
    }

    const preferredSession =
      sessions.find((session) => session.status === "live") ??
      sessions.find((session) => session.status === "draft") ??
      sessions[0];

    return preferredSession?._id ?? "";
  }, [sessions, selectedSessionId]);

  const activeSessionId = effectiveSelectedSessionId as Id<"presentationSessions"> | "";
  const sessionData = useQuery(
    api.sessions.getPresenterSessionState,
    token && hasValidatedPresenter && activeSessionId
      ? {
          token,
          sessionId: activeSessionId,
        }
      : "skip"
  );

  const isDemo = presenter?.isDemo ?? false;
  const accountEmail = presenter?.email ?? presenterEmail;
  const accountName = presenter?.name ?? presenterName;

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    persistState({
      token,
      presenterEmail: accountEmail,
      presenterName: accountName,
      selectedSessionId: effectiveSelectedSessionId,
    });
  }, [hydrated, token, accountEmail, accountName, effectiveSelectedSessionId]);

  useEffect(() => {
    if (!token || presenter === undefined || presenter !== null) {
      return;
    }

    setToken("");
    setPresenterEmail("");
    setPresenterName("");
    setSelectedSessionId("");
    setLoginError("Die gespeicherte Sitzung ist abgelaufen. Bitte erneut anmelden.");
  }, [presenter, token]);

  const resetAuthSession = useCallback(() => {
    setToken("");
    setPresenterEmail("");
    setPresenterName("");
    setSelectedSessionId("");
    setLoginError(null);
  }, []);

  return {
    hydrated,
    token,
    setToken,
    selectedSessionId,
    setSelectedSessionId,
    sessions,
    sessionData,
    activeSessionId,
    effectiveSelectedSessionId,
    isDemo,
    accountEmail,
    accountName,
    loginError,
    setLoginError,
    setPresenterEmail,
    setPresenterName,
    resetAuthSession,
  };
}

function useOfficeBridgeLifecycle({
  token,
  activeSessionId,
  isDemo,
  syncSlide,
  onError,
}: {
  token: string;
  activeSessionId: Id<"presentationSessions"> | "";
  isDemo: boolean;
  syncSlide: (slideNumber: number, totalSlides?: number, presentationTitle?: string) => Promise<void>;
  onError?: (message: string) => void;
}) {
  const [syncStatus, setSyncStatus] = useState<SyncCapability>("manual_only");
  const [officeDetected, setOfficeDetected] = useState(false);
  const [bridgeState, setBridgeState] = useState<{
    sessionId: string;
    slide: number | null;
  }>({
    sessionId: "",
    slide: null,
  });

  useEffect(() => {
    setSyncStatus("manual_only");

    const officeScriptPresent = typeof (globalThis as any).Office !== "undefined";
    if (!officeScriptPresent || !token || !activeSessionId || isDemo) {
      setOfficeDetected(false);
      return;
    }

    let active = true;
    void initOfficeBridge({
      onSlideChange: (info) => {
        if (!active) return;
        setBridgeState({ sessionId: activeSessionId, slide: info.slideNumber });
        void syncSlide(info.slideNumber, info.totalSlides, info.presentationTitle);
      },
      onModeChange: (mode) => {
        if (!active) return;
        setSyncStatus(mode);
      },
      onError: (message) => {
        if (!active) return;
        onError?.(message);
        setSyncStatus("hybrid");
      },
    }).then((mode) => {
      if (!active) return;
      setSyncStatus(mode);
      setOfficeDetected(mode !== "manual_only");
    });

    return () => {
      active = false;
      destroyOfficeBridge();
    };
  }, [token, activeSessionId, isDemo, syncSlide, onError]);

  const setBridgeSlideForSession = useCallback((sessionId: string, slide: number | null) => {
    setBridgeState({ sessionId, slide });
  }, []);

  const bridgeSlideForSession = useCallback(
    (sessionId: string) => (bridgeState.sessionId === sessionId ? bridgeState.slide : null),
    [bridgeState]
  );

  return {
    syncStatus,
    officeDetected,
    setBridgeSlideForSession,
    bridgeSlideForSession,
  };
}

export function PowerPointAddinClient() {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginPending, setLoginPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [slideInput, setSlideInput] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  const login = useMutation(api.auth.login);
  const logout = useMutation(api.auth.logout);
  const startSession = useMutation(api.sessions.startSession);
  const stopSession = useMutation(api.sessions.stopSession);
  const setCurrentSlide = useMutation(api.sessions.setCurrentSlide);
  const {
    hydrated,
    token,
    setToken,
    setSelectedSessionId,
    sessions,
    sessionData,
    activeSessionId,
    effectiveSelectedSessionId,
    isDemo,
    accountEmail,
    accountName,
    loginError,
    setLoginError,
    setPresenterEmail,
    setPresenterName,
    resetAuthSession,
  } = useAddinAuthSessionSync();

  const syncSlide = useCallback(
    async (slideNumber: number, totalSlides?: number, presentationTitle?: string) => {
      if (!token || !activeSessionId || isDemo) {
        return;
      }

      setIsSyncing(true);
      setActionError(null);

      try {
        await setCurrentSlide({
          token,
          sessionId: activeSessionId,
          slideNumber,
          totalSlides,
          presentationTitle,
        });
      } catch (error) {
        setActionError(getErrorMessage(error));
      } finally {
        setIsSyncing(false);
      }
    },
    [token, activeSessionId, isDemo, setCurrentSlide]
  );
  const {
    syncStatus,
    officeDetected,
    setBridgeSlideForSession,
    bridgeSlideForSession,
  } = useOfficeBridgeLifecycle({
    token,
    activeSessionId,
    isDemo,
    syncSlide,
    onError: (message) => setActionError(message),
  });

  const lastKnownSlide =
    bridgeSlideForSession(effectiveSelectedSessionId) ??
    sessionData?.session.currentSlide ??
    1;

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

  const handleManualSlide = async (nextSlide: number) => {
    const normalizedSlide = Math.max(1, nextSlide);
    setBridgeSlideForSession(effectiveSelectedSessionId, normalizedSlide);
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
    resetAuthSession();
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
    if (!token || !activeSessionId || isDemo) {
      return;
    }

    setActionError(null);

    try {
      await startSession({
        token,
        sessionId: activeSessionId,
      });
    } catch (error) {
      setActionError(getErrorMessage(error));
    }
  };

  const handleStopSession = async () => {
    if (!token || !activeSessionId || isDemo) {
      return;
    }

    setActionError(null);

    try {
      await stopSession({
        token,
        sessionId: activeSessionId,
      });
    } catch (error) {
      setActionError(getErrorMessage(error));
    }
  };

  const publicUrl = sessionData
    ? `${getClientOrigin()}${sessionData.publicUrl}`
    : "";

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col gap-4 px-4 py-5">
        <div className="card">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">PowerPoint taskpane</p>
              <h1 className="mt-3 text-4xl">Slide Handout</h1>
            </div>
            <Link href="/powerpoint" className="btn-secondary">
              Install-Guide
            </Link>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[22px] border border-stone-900/8 bg-white/70 px-4 py-3">
              <div className="metric-label">Verbindung</div>
              <div className="mt-2 text-base font-semibold text-stone-900">
                {token ? "Angemeldet" : "Nicht angemeldet"}
              </div>
            </div>
            <div className="rounded-[22px] border border-stone-900/8 bg-white/70 px-4 py-3">
              <div className="metric-label">PowerPoint</div>
              <div className="mt-2 text-base font-semibold text-stone-900">
                {officeDetected ? "Erkannt" : "Browser-Modus"}
              </div>
            </div>
          </div>
        </div>

        {!hydrated ? (
          <div className="section-panel text-sm text-stone-500">Lade Add-in...</div>
        ) : !token ? (
          <div className="card">
            <div className="eyebrow">Anmeldung</div>
            <h2 className="mt-3 text-3xl">Presenter-Account verbinden</h2>
            <p className="page-copy mt-2 max-w-none">
              Verwenden Sie dieselben Zugangsdaten wie im Dashboard.
            </p>
            <form className="mt-5 space-y-4" onSubmit={handleLogin}>
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
                <div className="rounded-[22px] border border-red-300/40 bg-red-50/90 px-4 py-3 text-sm text-red-700">
                  {loginError}
                </div>
              )}
              <button className="btn-primary w-full" type="submit" disabled={loginPending}>
                {loginPending ? "Anmeldung läuft..." : "Anmelden"}
              </button>
            </form>
          </div>
        ) : (
          <>
            <div className="card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="eyebrow">Verbunden</div>
                  <h2 className="mt-3 text-3xl">{accountName || accountEmail}</h2>
                </div>
                <button className="btn-secondary" onClick={handleLogout}>
                  Abmelden
                </button>
              </div>

              {isDemo && (
                <div className="soft-note mt-5">
                  Demo-Modus erkannt. Schreibende Steuerung bleibt aus Sicherheitsgründen gesperrt.
                </div>
              )}

              <div className="mt-5">
                <label className="label">Session</label>
                <select
                  className="input"
                  value={effectiveSelectedSessionId}
                  onChange={(event) => setSelectedSessionId(event.target.value)}
                >
                  <option value="">
                    {sessions === undefined
                      ? "Sessions werden geladen..."
                      : sessions.length === 0
                      ? "Keine Sessions vorhanden"
                      : "Session auswählen"}
                  </option>
                  {sessionOptions.map((session) => (
                    <option key={session._id} value={session._id}>
                      {session.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {activeSessionId && sessionData && (
              <>
                <div className="card">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="eyebrow">Aktive Session</div>
                      <h2 className="mt-3 text-3xl">{sessionData.handout?.title ?? "Ohne Titel"}</h2>
                      <p className="mt-2 text-sm text-stone-600">
                        Status: {statusLabel[sessionData.session.status]}
                      </p>
                    </div>
                    <div
                      className={`rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] ${syncBadgeClasses[syncStatus]}`}
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

                  <div className="mt-5 flex gap-3">
                    {sessionData.session.status === "draft" ? (
                      <button className="btn-primary flex-1" onClick={handleStartSession} disabled={isDemo}>
                        Session starten
                      </button>
                    ) : sessionData.session.status === "live" ? (
                      <button className="btn-danger flex-1" onClick={handleStopSession} disabled={isDemo}>
                        Session beenden
                      </button>
                    ) : (
                      <div className="flex-1 rounded-[20px] border border-stone-900/8 bg-stone-100/60 px-4 py-3 text-center text-sm text-stone-600">
                        Diese Session ist bereits beendet.
                      </div>
                    )}
                    {publicUrl && (
                      <a href={publicUrl} target="_blank" rel="noreferrer" className="btn-secondary">
                        Handout
                      </a>
                    )}
                  </div>
                </div>

                <div className="card">
                  <div className="rounded-[24px] border border-stone-900/8 bg-white/72 p-5 text-center">
                    <div className="metric-label">Aktuelle Folie</div>
                    <div className="mt-3 text-6xl text-stone-900">{lastKnownSlide}</div>
                    <p className="mt-2 text-sm text-stone-500">
                      {sessionData.session.totalSlides
                        ? `von ${sessionData.session.totalSlides} Folien`
                        : "ohne bekannte Gesamtzahl"}
                    </p>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <button
                      className="btn-secondary"
                      onClick={() => void handleManualSlide(lastKnownSlide - 1)}
                      disabled={isDemo || isSyncing}
                    >
                      Zurück
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
                    className="mt-4 flex gap-3"
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
                    <button className="btn-secondary whitespace-nowrap" type="submit" disabled={isDemo || isSyncing}>
                      Setzen
                    </button>
                  </form>

                  <div className="mt-4 rounded-[22px] border border-stone-900/8 bg-stone-100/65 px-4 py-3 text-sm leading-7 text-stone-600">
                    {officeDetected
                      ? "Wenn PowerPoint Folienwechsel meldet, synchronisiert das Add-in automatisch. Die Tasten bleiben als Fallback aktiv."
                      : "Im Browser können Sie den Ablauf ohne PowerPoint testen. Auto-Sync ist dort nicht verfügbar."}
                  </div>
                </div>
              </>
            )}

            {activeSessionId && !sessionData && (
              <div className="section-panel text-sm text-stone-500">Session wird geladen...</div>
            )}

            {!activeSessionId && sessions !== undefined && sessions.length === 0 && (
              <div className="section-panel border-dashed text-sm text-stone-600">
                Noch keine Session vorhanden. Erstellen Sie im{" "}
                <Link href="/dashboard" className="font-semibold underline decoration-stone-300">
                  Dashboard
                </Link>{" "}
                ein Handout und starten Sie daraus eine Session.
              </div>
            )}
          </>
        )}

        {actionError && (
          <div className="rounded-[22px] border border-red-300/40 bg-red-50/90 px-4 py-3 text-sm text-red-700">
            {actionError}
          </div>
        )}
      </div>
    </div>
  );
}
