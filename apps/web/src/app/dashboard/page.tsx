"use client";

import { useMemo, useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@convex/_generated/api";
import { useAuthStore } from "@/store/authStore";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  const deleteSessions = useMutation(api.sessions.deleteSessions);
  const reopenSession = useMutation(api.sessions.reopenSession);

  const [activeTab, setActiveTab] = useState<"handouts" | "sessions">("handouts");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newHandoutTitle, setNewHandoutTitle] = useState("");
  const [newHandoutDesc, setNewHandoutDesc] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [selectedSessions, setSelectedSessions] = useState<Set<Id<"presentationSessions">>>(new Set());

  const sessionIdSet = useMemo(
    () => new Set((sessions ?? []).map((session) => session._id)),
    [sessions]
  );

  const effectiveSelectedSessions = useMemo(() => {
    const effective = new Set<Id<"presentationSessions">>();
    selectedSessions.forEach((id) => {
      if (sessionIdSet.has(id)) {
        effective.add(id);
      }
    });
    return effective;
  }, [selectedSessions, sessionIdSet]);

  const toggleSession = useCallback((id: Id<"presentationSessions">) => {
    setSelectedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleAllSessions = useCallback(() => {
    if (!sessions) return;
    setSelectedSessions((prev) =>
      effectiveSelectedSessions.size === sessions.length
        ? new Set()
        : new Set(sessions.map((s) => s._id))
    );
  }, [effectiveSelectedSessions.size, sessions]);

  const handleBulkDelete = async () => {
    if (!token || effectiveSelectedSessions.size === 0) return;
    if (!confirm(`${effectiveSelectedSessions.size} Session(s) löschen?`)) return;
    await deleteSessions({
      token,
      sessionIds: [...effectiveSelectedSessions],
    });
    setSelectedSessions(new Set());
  };

  const handleReopenSession = async (sessionId: Id<"presentationSessions">) => {
    if (!token) return;
    await reopenSession({ token, sessionId });
  };

  const counts = useMemo(() => {
    const allHandouts = handouts ?? [];
    const allSessions = sessions ?? [];
    return {
      handouts: allHandouts.length,
      liveSessions: allSessions.filter((s) => s.status === "live").length,
      drafts: allSessions.filter((s) => s.status === "draft").length,
    };
  }, [handouts, sessions]);

  const handleCreateHandout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newHandoutTitle.trim()) return;
    setIsCreating(true);
    try {
      const id = await createHandout({
        token, title: newHandoutTitle.trim(),
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
    const map: Record<string, "green" | "yellow" | "red" | "gray"> = { live: "green", draft: "yellow", ended: "gray" };
    const labels: Record<string, string> = { live: "Live", draft: "Entwurf", ended: "Beendet" };
    return <Badge variant={map[status] ?? "gray"}>{labels[status] ?? status}</Badge>;
  };

  const hasSessionConflicts = useMemo(() => {
    if (!sessions) return false;
    const liveCounts: Record<string, number> = {};
    sessions.forEach((s) => { if (s.status === "live") liveCounts[s.handoutId] = (liveCounts[s.handoutId] ?? 0) + 1; });
    return Object.values(liveCounts).some((c) => c > 1);
  }, [sessions]);

  return (
    <div className="page-shell py-8 space-y-6">
      {isDemo && (
        <div className="soft-note">
          Demo-Modus: Sie können alles ansehen, aber nichts ändern oder steuern.
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-soft)" }}>
            Ihre Handouts und Sessions auf einen Blick.
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => setIsCreateOpen(true)} disabled={isDemo}>
            Neues Handout
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="metric-card">
          <div className="metric-label">Handouts</div>
          <div className="metric-value">{counts.handouts}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Live-Sessions</div>
          <div className="metric-value">{counts.liveSessions}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Entwürfe</div>
          <div className="metric-value">{counts.drafts}</div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "handouts" | "sessions")}
      >
        <TabsList>
          <TabsTrigger value="handouts">Handouts</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Handouts Tab */}
      {activeTab === "handouts" && (
        <section>
          {!handouts ? (
            <div className="py-12 text-center text-sm" style={{ color: "var(--ink-muted)" }}>Lädt…</div>
          ) : handouts.length === 0 ? (
            <div className="empty-state">
              <h2 className="text-xl font-semibold">Noch keine Handouts</h2>
              <p className="mt-2 text-sm" style={{ color: "var(--ink-soft)" }}>
                Erstellen Sie Ihr erstes Handout und legen Sie fest, wann welche Inhalte sichtbar werden.
              </p>
              <button className="btn-primary mt-5" onClick={() => setIsCreateOpen(true)} disabled={isDemo}>
                Handout erstellen
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {handouts.map((h) => (
                <div key={h._id} className="card flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{h.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>
                      {h.description || "Keine Beschreibung"}
                    </p>
                  </div>
                  <div className="mt-5 space-y-3">
                    <div className="text-xs" style={{ color: "var(--ink-muted)" }}>
                      {new Date(h.createdAt).toLocaleDateString("de-DE")}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button className="btn-primary flex-1"
                        onClick={() => router.push(`/dashboard/handout/${h._id}`)}>
                        {isDemo ? "Ansehen" : "Bearbeiten"}
                      </button>
                      <button className="btn-secondary" onClick={() => handleCreateSession(h._id)} disabled={isDemo}>
                        Session
                      </button>
                      <button className="btn-danger" disabled={isDemo}
                        onClick={() => confirm("Handout löschen?") && token &&
                          deleteHandout({ token, handoutId: h._id as Id<"handouts"> })}>
                        Löschen
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Sessions Tab */}
      {activeTab === "sessions" && (
        <section className="space-y-4">
          {hasSessionConflicts && (
            <div className="soft-note">
              Mehrere Live-Sessions für dasselbe Handout aktiv — beenden Sie nicht benötigte Sessions.
            </div>
          )}

          {sessions && sessions.length > 0 && (
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--ink-soft)" }}>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={effectiveSelectedSessions.size === sessions.length}
                  onChange={toggleAllSessions}
                />
                Alle auswählen
              </label>
              {effectiveSelectedSessions.size > 0 && (
                <button className="btn-danger text-xs px-3 py-1.5" onClick={handleBulkDelete} disabled={isDemo}>
                  {effectiveSelectedSessions.size} löschen
                </button>
              )}
            </div>
          )}

          {!sessions ? (
            <div className="py-12 text-center text-sm" style={{ color: "var(--ink-muted)" }}>Lädt…</div>
          ) : sessions.length === 0 ? (
            <div className="empty-state">
              <h2 className="text-xl font-semibold">Keine Sessions</h2>
              <p className="mt-2 text-sm" style={{ color: "var(--ink-soft)" }}>
                Erstellen Sie eine Session aus einem Ihrer Handouts.
              </p>
            </div>
          ) : (
            sessions.map((s) => (
              <div key={s._id} className="card flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 flex-shrink-0"
                    checked={effectiveSelectedSessions.has(s._id)}
                    onChange={() => toggleSession(s._id)}
                    aria-label={`Session ${s.publicToken} auswählen`}
                  />
                  {statusBadge(s.status)}
                  <div>
                    <div className="font-medium">
                      Folie {s.currentSlide}{s.totalSlides ? ` / ${s.totalSlides}` : ""}
                    </div>
                    <div className="mt-0.5 text-sm" style={{ color: "var(--ink-muted)" }}>
                      /h/{s.publicToken} · {new Date(s.createdAt).toLocaleDateString("de-DE")}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {s.status === "ended" && (
                    <button className="btn-secondary" onClick={() => handleReopenSession(s._id)} disabled={isDemo}>
                      Wieder öffnen
                    </button>
                  )}
                  <button className="btn-primary" onClick={() => router.push(`/dashboard/session/${s._id}`)}>
                    Öffnen
                  </button>
                  <a href={`/h/${s.publicToken}`} target="_blank" rel="noopener noreferrer" className="btn-secondary">Handout</a>
                  <button className="btn-danger" disabled={isDemo}
                    onClick={() => confirm("Session löschen?") && token &&
                      deleteSession({ token, sessionId: s._id as Id<"presentationSessions"> })}>
                    Löschen
                  </button>
                </div>
              </div>
            ))
          )}
        </section>
      )}

      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Neues Handout">
        <form onSubmit={handleCreateHandout} className="space-y-4">
          <div>
            <label className="label">Titel</label>
            <Input value={newHandoutTitle}
              onChange={(e) => setNewHandoutTitle(e.target.value)}
              placeholder="z. B. Einführung in Machine Learning" required autoFocus />
          </div>
          <div>
            <label className="label">Beschreibung (optional)</label>
            <Textarea value={newHandoutDesc}
              onChange={(e) => setNewHandoutDesc(e.target.value)} rows={3}
              placeholder="Worum geht es in diesem Handout?" />
          </div>
          <div className="flex gap-3">
            <Button type="submit" className="flex-1" disabled={isCreating || isDemo}>
              {isCreating ? "Erstellt…" : "Erstellen"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
              Abbrechen
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
