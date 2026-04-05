"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import { useAuthStore } from "@/store/authStore";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import type { Id } from "../../../convex/_generated/dataModel";

export default function DashboardPage() {
  const { token } = useAuthStore();
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

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Verwalten Sie Ihre Handouts und Präsentationssessions</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => setIsCreateOpen(true)}
        >
          + Neues Handout
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {(["handouts", "sessions"] as const).map((tab) => (
          <button
            key={tab}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "handouts" ? "Handouts" : "Sessions"}
          </button>
        ))}
      </div>

      {/* Handouts Tab */}
      {activeTab === "handouts" && (
        <div>
          {!handouts ? (
            <div className="text-center py-12 text-gray-500">Lädt...</div>
          ) : handouts.length === 0 ? (
            <div className="text-center py-12 card">
              <span className="text-4xl mb-4 block">📄</span>
              <h2 className="text-lg font-medium text-gray-900 mb-2">Noch keine Handouts</h2>
              <p className="text-gray-600 text-sm mb-4">
                Erstellen Sie Ihr erstes Handout für eine Präsentation.
              </p>
              <button className="btn-primary" onClick={() => setIsCreateOpen(true)}>
                Handout erstellen
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {handouts.map((handout) => (
                <div key={handout._id} className="card hover:shadow-md transition-shadow">
                  <h3 className="font-semibold text-gray-900 mb-1 truncate">{handout.title}</h3>
                  {handout.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{handout.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mb-4">
                    {new Date(handout.createdAt).toLocaleDateString("de-DE")}
                  </p>
                  <div className="flex gap-2">
                    <button
                      className="btn-primary flex-1 text-xs"
                      onClick={() => router.push(`/dashboard/handout/${handout._id}`)}
                    >
                      Bearbeiten
                    </button>
                    <button
                      className="btn-secondary text-xs px-3"
                      onClick={() => handleCreateSession(handout._id)}
                    >
                      Session
                    </button>
                    <button
                      className="btn-danger text-xs px-3"
                      onClick={() =>
                        confirm("Handout wirklich löschen?") &&
                        token &&
                        deleteHandout({ token, handoutId: handout._id as Id<"handouts"> })
                      }
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sessions Tab */}
      {activeTab === "sessions" && (
        <div>
          {!sessions ? (
            <div className="text-center py-12 text-gray-500">Lädt...</div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 card">
              <span className="text-4xl mb-4 block">🎯</span>
              <p className="text-gray-600">Noch keine Sessions. Starten Sie eine aus einem Handout.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session._id}
                  className="card flex items-center justify-between hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-4">
                    {statusBadge(session.status)}
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        Folie {session.currentSlide}
                        {session.totalSlides ? ` / ${session.totalSlides}` : ""}
                      </div>
                      <div className="text-xs text-gray-500">
                        Token: /h/{session.publicToken}
                        {" · "}
                        {new Date(session.createdAt).toLocaleDateString("de-DE")}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="btn-primary text-xs"
                      onClick={() => router.push(`/dashboard/session/${session._id}`)}
                    >
                      Öffnen
                    </button>
                    <a
                      href={`/h/${session.publicToken}`}
                      target="_blank"
                      className="btn-secondary text-xs"
                    >
                      Handout
                    </a>
                    <button
                      className="btn-danger text-xs px-2"
                      onClick={() =>
                        confirm("Session löschen?") &&
                        token &&
                        deleteSession({ token, sessionId: session._id as Id<"presentationSessions"> })
                      }
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Handout Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Neues Handout"
      >
        <form onSubmit={handleCreateHandout} className="space-y-4">
          <div>
            <label className="label">Titel *</label>
            <input
              className="input"
              value={newHandoutTitle}
              onChange={(e) => setNewHandoutTitle(e.target.value)}
              placeholder="z. B. Einführung in KI"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="label">Beschreibung (optional)</label>
            <textarea
              className="textarea"
              value={newHandoutDesc}
              onChange={(e) => setNewHandoutDesc(e.target.value)}
              rows={3}
              placeholder="Kurze Beschreibung des Handouts..."
            />
          </div>
          <div className="flex gap-3">
            <button type="submit" className="btn-primary flex-1" disabled={isCreating}>
              {isCreating ? "Erstellt..." : "Erstellen"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsCreateOpen(false)}
            >
              Abbrechen
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
