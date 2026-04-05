"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useAuthStore } from "@/store/authStore";
import type { Id } from "@convex/_generated/dataModel";

interface SlideControlsProps {
  sessionId: string;
  currentSlide: number;
  totalSlides?: number;
  syncMode: string;
}

export function SlideControls({
  sessionId,
  currentSlide,
  totalSlides,
  syncMode,
}: SlideControlsProps) {
  const { token } = useAuthStore();
  const nextSlide = useMutation(api.sessions.nextSlide);
  const previousSlide = useMutation(api.sessions.previousSlide);
  const jumpToSlide = useMutation(api.sessions.jumpToSlide);
  const setSyncMode = useMutation(api.sessions.setSyncMode);

  const [jumpInput, setJumpInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleAction = async (action: () => Promise<any>) => {
    if (!token) return;
    setIsLoading(true);
    try {
      await action();
    } finally {
      setIsLoading(false);
    }
  };

  const handleJump = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !jumpInput) return;
    const slide = parseInt(jumpInput);
    if (isNaN(slide) || slide < 1) return;
    await handleAction(() =>
      jumpToSlide({ token, sessionId: sessionId as Id<"presentationSessions">, slideNumber: slide })
    );
    setJumpInput("");
  };

  const syncModeLabel: Record<string, string> = {
    auto: "Auto-Sync",
    hybrid: "Hybrid-Modus",
    manual: "Manuell",
  };

  const syncModeColor: Record<string, string> = {
    auto: "bg-green-100 text-green-800",
    hybrid: "bg-yellow-100 text-yellow-800",
    manual: "bg-gray-100 text-gray-700",
  };

  return (
    <div className="space-y-4">
      {/* Current slide indicator */}
      <div className="flex items-center justify-between">
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900">{currentSlide}</div>
          {totalSlides && (
            <div className="text-sm text-gray-500">von {totalSlides}</div>
          )}
          <div className="text-xs text-gray-400 mt-1">Aktuelle Folie</div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${syncModeColor[syncMode] ?? "bg-gray-100"}`}>
            {syncModeLabel[syncMode] ?? syncMode}
          </span>
        </div>
      </div>

      {/* Prev / Next buttons */}
      <div className="flex gap-2">
        <button
          className="btn-secondary flex-1"
          onClick={() =>
            handleAction(() =>
              previousSlide({ token: token!, sessionId: sessionId as Id<"presentationSessions"> })
            )
          }
          disabled={isLoading || currentSlide <= 1}
        >
          ← Zurück
        </button>
        <button
          className="btn-primary flex-1"
          onClick={() =>
            handleAction(() =>
              nextSlide({ token: token!, sessionId: sessionId as Id<"presentationSessions"> })
            )
          }
          disabled={isLoading || (totalSlides !== undefined && currentSlide >= totalSlides)}
        >
          Weiter →
        </button>
      </div>

      {/* Jump to slide */}
      <form onSubmit={handleJump} className="flex gap-2">
        <input
          type="number"
          className="input flex-1"
          value={jumpInput}
          onChange={(e) => setJumpInput(e.target.value)}
          placeholder="Folie Nr."
          min={1}
          max={totalSlides}
        />
        <button type="submit" className="btn-secondary px-4" disabled={isLoading}>
          Springen
        </button>
      </form>

      {/* Sync mode switcher */}
      <div className="border-t pt-3">
        <label className="text-xs font-medium text-gray-500 mb-2 block">Sync-Modus</label>
        <div className="flex gap-2">
          {(["auto", "hybrid", "manual"] as const).map((mode) => (
            <button
              key={mode}
              className={`flex-1 px-2 py-1 text-xs rounded border transition-colors ${
                syncMode === mode
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
              onClick={() =>
                token &&
                setSyncMode({ token, sessionId: sessionId as Id<"presentationSessions">, syncMode: mode })
              }
            >
              {syncModeLabel[mode]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
