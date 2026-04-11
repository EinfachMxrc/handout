"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@convex/_generated/api";
import { useAuthStore } from "@/store/authStore";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import type { Id } from "@convex/_generated/dataModel";

export default function DashboardPage() {
  const { token, isDemo } = useAuthStore();
  const router = useRouter();

  const handouts = useQuery(api.handouts.listHandouts, token ? { token } : "skip");
  const sessions = useQuery(api.sessions.listSessions, token ? { token } : "skip");
  const createHandout = useMutation(api.handouts.createHandout);
  const deleteHandout = useMutation(api.handouts.deleteHandout);
  const createSession = useMutation(api.sessions.createSession);
  const deleteSession = useMutation(api.sessions.deleteSession);

  const [activeTab, setActiveTab] = useState<"handouts" | "sessions">("handouts");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newHandoutTitle, setNewHandoutTitle] = useState("");
  const [newHandoutDesc, setNewHandoutDesc] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const counts = useMemo(() => {
    const allHandouts = handouts ?? [];
    const allSessions = sessions ?? [];
    return {
      handouts: allHandouts.length,
      liveSessions: allSessions.filter((session) => session.status === "live").length,
      drafts: allSessions.filter((session) => session.status === "draft").length,
    };
  }, [handouts, sessions]);

  const handleCreateHandout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newHandoutTitle.trim()) return;
    setIsCreating(true);
    try {
      const id = await createHandout({
        token,
        title: newHandoutTitle.trim(),
        description: newHandoutDesc.trim() || undefined,
      });
      setIsCreateOpen(false);
      setNewHandoutTitle("");
      setNewHandoutDesc("");
      router.push(`/dashboard/handout/${id}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateSession = async (handoutId: string) => {
    if (!token) return;
    const sessionId = await createSession({ token, handoutId: handoutId as Id<"handouts"> });
    router.push(`/dashboard/session/${sessionId}`);
  };

  const statusBadge = (status: string) => {
    const map: Record<string, "green" | "yellow" | "red" | "gray"> = {
      live: "green",
      draft: "yellow",
      ended: "gray",
    };
    const labels: Record<string, string> = {
      live: "Live",
      draft: "Entwurf",
      ended: "Beendet",
    };
    return <Badge variant={map[status] ?? "gray"}>{labels[status] ?? status}</Badge>;
  };

  const hasSessionConflicts = useMemo(() => {
    if (!sessions) return false;
    const liveCounts: Record<string, number> = {};
    sessions.forEach((session) => {
      if (session.status === "live") {
        liveCounts[session.handoutId] = (liveCounts[session.handoutId] ?? 0) + 1;
      }
    });
    return Object.values(liveCounts).some((count) => count > 1);
  }, [sessions]);

  return (
    <div className="space-y-8">
      <section className="page-hero">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="kicker-pill">Presenter dashboard</span>
            <h1 className="page-title max-w-4xl text-5xl sm:text-6xl">
              Verwalten Sie Handouts, Sessions und Ihren gesamten Vortragsfluss.
            </h1>
            <p className="page-copy max-w-2xl">
              Diese Arbeitsflaeche ist Ihr Steuerpult fuer Inhalt, Reveal-Regeln
              und Live-Freigaben. Handouts werden hier gebaut, Sessions von hier
              gestartet und oeffentliche Leseransichten von hier verteilt.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button className="btn-primary" onClick={() => setIsCreateOpen(true)} disabled={isDemo}>
              Neues Handout
            </button>
            <button
              className="btn-secondary"
              onClick={() => setActiveTab(activeTab === "handouts" ? "sessions" : "handouts")}
            >
              Zu {activeTab === "handouts" ? "Sessions" : "Handouts"}
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="metric-card">
            <div className="metric-label">Handouts</div>
            <div className="metric-value">{counts.handouts}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Live-Sessions</div>
            <div className="metric-value">{counts.liveSessions}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Entwuerfe</div>
            <div className="metric-value">{counts.drafts}</div>
          </div>
        </div>
      </section>

      <div className="segmented-shell">
        {(["handouts", "sessions"] as const).map((tab) => (
          <button
            key={tab}
            className="segmented-button"
            data-active={activeTab === tab}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "handouts" ? "Handouts" : "Sessions"}
          </button>
        ))}
      </div>

      {activeTab === "handouts" && (
        <section>
          {!handouts ? (
            <div className="section-panel text-center text-stone-500">Laedt Handouts...</div>
          ) : handouts.length === 0 ? (
            <div className="empty-state">
              <div className="eyebrow">Noch leer</div>
              <h2 className="mt-3 text-4xl">Ihr erstes Handout wartet.</h2>
              <p className="page-copy mx-auto max-w-xl">
                Legen Sie die Struktur Ihres Vortrags an und definieren Sie pro
                Block, wann Inhalte sichtbar werden sollen.
              </p>
              <div className="mt-6">
                <button className="btn-primary" onClick={() => setIsCreateOpen(true)} disabled={isDemo}>
                  Handout erstellen
                </button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {handouts.map((handout) => (
                <article key={handout._id} className="card flex h-full flex-col justify-between">
                  <div>
                    <div className="eyebrow">Handout</div>
                    <h2 className="mt-3 text-3xl leading-tight">{handout.title}</h2>
                    <p className="mt-3 min-h-[3.5rem] text-sm leading-7 text-stone-600">
                      {handout.description || "Noch keine Beschreibung hinterlegt."}
                    </p>
                  </div>

                  <div className="mt-6 space-y-4">
                    <div className="text-xs uppercase tracking-[0.16em] text-stone-500">
                      Erstellt am {new Date(handout.createdAt).toLocaleDateString("de-DE")}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="btn-primary flex-1"
                        onClick={() => router.push(`/dashboard/handout/${handout._id}`)}
                      >
                        {isDemo ? "Ansehen" : "Bearbeiten"}
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={() => handleCreateSession(handout._id)}
                        disabled={isDemo}
                      >
                        Session
                      </button>
                      <button
                        className="btn-danger"
                        disabled={isDemo}
                        onClick={() =>
                          confirm("Handout wirklich loeschen?") &&
                          token &&
                          deleteHandout({ token, handoutId: handout._id as Id<"handouts"> })
                        }
                      >
                        Loeschen
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === "sessions" && (
        <section className="space-y-4">
          {hasSessionConflicts && (
            <div className="soft-note">
              Es laufen mehrere Live-Sessions fuer dasselbe Handout gleichzeitig.
              Beenden Sie nicht mehr benoetigte Sessions, damit die Freigabelogik
              eindeutig bleibt.
            </div>
          )}

          {!sessions ? (
            <div className="section-panel text-center text-stone-500">Laedt Sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="empty-state">
              <div className="eyebrow">Noch keine Session</div>
              <h2 className="mt-3 text-4xl">Starten Sie eine Session aus einem Handout.</h2>
              <p className="page-copy mx-auto max-w-xl">
                Sobald ein Handout vorbereitet ist, koennen Sie daraus einen
                Live-Lesemodus fuer Publikum und PowerPoint-Steuerung erzeugen.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <article
                  key={session._id}
                  className="card flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    {statusBadge(session.status)}
                    <div>
                      <div className="text-lg font-semibold text-stone-900">
                        Folie {session.currentSlide}
                        {session.totalSlides ? ` / ${session.totalSlides}` : ""}
                      </div>
                      <div className="mt-1 text-sm text-stone-600">
                        Link: /h/{session.publicToken}
                      </div>
                      <div className="mt-1 text-xs uppercase tracking-[0.16em] text-stone-500">
                        {new Date(session.createdAt).toLocaleDateString("de-DE")}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      className="btn-primary"
                      onClick={() => router.push(`/dashboard/session/${session._id}`)}
                    >
                      Oeffnen
                    </button>
                    <a
                      href={`/h/${session.publicToken}`}
                      target="_blank"
                      className="btn-secondary"
                    >
                      Handout
                    </a>
                    <button
                      className="btn-danger"
                      disabled={isDemo}
                      onClick={() =>
                        confirm("Session loeschen?") &&
                        token &&
                        deleteSession({ token, sessionId: session._id as Id<"presentationSessions"> })
                      }
                    >
                      Loeschen
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Neues Handout">
        <form onSubmit={handleCreateHandout} className="space-y-4">
          <div>
            <label className="label">Titel *</label>
            <input
              className="input"
              value={newHandoutTitle}
              onChange={(e) => setNewHandoutTitle(e.target.value)}
              placeholder="z. B. Einfuehrung in KI"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="label">Beschreibung</label>
            <textarea
              className="textarea"
              value={newHandoutDesc}
              onChange={(e) => setNewHandoutDesc(e.target.value)}
              rows={3}
              placeholder="Kurze Beschreibung des Handouts..."
            />
          </div>
          <div className="flex gap-3">
            <button type="submit" className="btn-primary flex-1" disabled={isCreating || isDemo}>
              {isCreating ? "Erstellt..." : "Erstellen"}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setIsCreateOpen(false)}>
              Abbrechen
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
