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
  disabled?: boolean;
}

export function SlideControls({
  sessionId,
  currentSlide,
  totalSlides,
  syncMode,
  disabled = false,
}: SlideControlsProps) {
  const { token } = useAuthStore();
  const nextSlide = useMutation(api.sessions.nextSlide);
  const previousSlide = useMutation(api.sessions.previousSlide);
  const jumpToSlide = useMutation(api.sessions.jumpToSlide);
  const setSyncMode = useMutation(api.sessions.setSyncMode);

  const [jumpInput, setJumpInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleAction = async (action: () => Promise<any>) => {
    if (!token || disabled) return;
    setIsLoading(true);
    try {
      await action();
    } finally {
      setIsLoading(false);
    }
  };

  const handleJump = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || disabled || !jumpInput) return;
    const slide = parseInt(jumpInput, 10);
    if (Number.isNaN(slide) || slide < 1) return;
    await handleAction(() =>
      jumpToSlide({ token, sessionId: sessionId as Id<"presentationSessions">, slideNumber: slide })
    );
    setJumpInput("");
  };

  const syncModeLabel: Record<string, string> = {
    auto: "Auto-Sync",
    hybrid: "Hybrid",
    manual: "Manuell",
  };

  const syncModeColor: Record<string, string> = {
    auto: "border-emerald-500/20 bg-emerald-50/90 text-emerald-800",
    hybrid: "border-amber-500/20 bg-amber-50/90 text-amber-800",
    manual: "border-stone-500/15 bg-stone-100/80 text-stone-700",
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[24px] border border-stone-900/8 bg-white/75 p-5 text-center">
          <div className="metric-label">Aktuelle Folie</div>
          <div className="mt-3 text-6xl leading-none text-stone-900">{currentSlide}</div>
          <div className="mt-2 text-sm text-stone-500">
            {totalSlides ? `von ${totalSlides}` : "Gesamtzahl offen"}
          </div>
        </div>

        <div className="rounded-[24px] border border-stone-900/8 bg-white/65 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="metric-label">Synchronisation</div>
              <div className="mt-2 text-base font-semibold text-stone-900">
                {syncModeLabel[syncMode] ?? syncMode}
              </div>
            </div>
            <span
              className={`rounded-full border px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.16em] ${syncModeColor[syncMode] ?? syncModeColor.manual}`}
            >
              {syncModeLabel[syncMode] ?? syncMode}
            </span>
          </div>

          <form onSubmit={handleJump} className="mt-5 flex gap-2">
            <input
              type="number"
              className="input flex-1"
              value={jumpInput}
              onChange={(e) => setJumpInput(e.target.value)}
              placeholder="Folie direkt setzen"
              min={1}
              max={totalSlides}
              disabled={disabled}
            />
            <button type="submit" className="btn-secondary px-4" disabled={disabled || isLoading}>
              Springen
            </button>
          </form>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          className="btn-secondary flex-1"
          onClick={() =>
            handleAction(() =>
              previousSlide({ token: token!, sessionId: sessionId as Id<"presentationSessions"> })
            )
          }
          disabled={disabled || isLoading || currentSlide <= 1}
        >
          Zurueck
        </button>
        <button
          className="btn-primary flex-1"
          onClick={() =>
            handleAction(() =>
              nextSlide({ token: token!, sessionId: sessionId as Id<"presentationSessions"> })
            )
          }
          disabled={disabled || isLoading || (totalSlides !== undefined && currentSlide >= totalSlides)}
        >
          Weiter
        </button>
      </div>

      <div>
        <label className="label">Sync-Modus</label>
        <div className="segmented-shell">
          {(["auto", "hybrid", "manual"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className="segmented-button"
              data-active={syncMode === mode}
              onClick={() =>
                token &&
                !disabled &&
                setSyncMode({ token, sessionId: sessionId as Id<"presentationSessions">, syncMode: mode })
              }
              disabled={disabled}
            >
              {syncModeLabel[mode]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
