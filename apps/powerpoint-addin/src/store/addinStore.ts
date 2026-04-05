/**
 * Add-in UI store – local state only.
 * Convex is the source of truth for session data.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AddinMode = "disconnected" | "connecting" | "connected";
export type SyncStatus = "auto" | "hybrid" | "manual_only";

interface AddinState {
  // Persisted
  sessionPublicToken: string;
  presenterToken: string;
  sessionId: string;
  convexUrl: string;

  // Runtime (not persisted)
  mode: AddinMode;
  syncStatus: SyncStatus;
  isOfficeAvailable: boolean;
  lastKnownSlide: number;
  connectionError: string | null;
  isSyncing: boolean;

  // Simulator state (only active when not in Office)
  simulatorTotalSlides: number;
  simulatorAutoAdvanceMs: number;

  // Settings open
  isSettingsOpen: boolean;

  // Actions
  setConnectionInfo: (info: {
    sessionPublicToken?: string;
    presenterToken?: string;
    sessionId?: string;
    convexUrl?: string;
  }) => void;
  setMode: (mode: AddinMode) => void;
  setSyncStatus: (status: SyncStatus) => void;
  setOfficeAvailable: (available: boolean) => void;
  setLastKnownSlide: (slide: number) => void;
  setConnectionError: (error: string | null) => void;
  setIsSyncing: (syncing: boolean) => void;
  setSimulatorConfig: (total: number, autoMs: number) => void;
  setIsSettingsOpen: (open: boolean) => void;
  reset: () => void;
}

export const useAddinStore = create<AddinState>()(
  persist(
    (set) => ({
      sessionPublicToken: "",
      presenterToken: "",
      sessionId: "",
      convexUrl: "",

      mode: "disconnected",
      syncStatus: "manual_only",
      isOfficeAvailable: false,
      lastKnownSlide: 1,
      connectionError: null,
      isSyncing: false,
      simulatorTotalSlides: 10,
      simulatorAutoAdvanceMs: 0,
      isSettingsOpen: false,

      setConnectionInfo: (info) => set((s) => ({ ...s, ...info })),
      setMode: (mode) => set({ mode }),
      setSyncStatus: (syncStatus) => set({ syncStatus }),
      setOfficeAvailable: (isOfficeAvailable) => set({ isOfficeAvailable }),
      setLastKnownSlide: (lastKnownSlide) => set({ lastKnownSlide }),
      setConnectionError: (connectionError) => set({ connectionError }),
      setIsSyncing: (isSyncing) => set({ isSyncing }),
      setSimulatorConfig: (simulatorTotalSlides, simulatorAutoAdvanceMs) =>
        set({ simulatorTotalSlides, simulatorAutoAdvanceMs }),
      setIsSettingsOpen: (isSettingsOpen) => set({ isSettingsOpen }),
      reset: () =>
        set({
          mode: "disconnected",
          syncStatus: "manual_only",
          lastKnownSlide: 1,
          connectionError: null,
          isSyncing: false,
        }),
    }),
    {
      name: "slide-handout-addin",
      partialize: (state) => ({
        sessionPublicToken: state.sessionPublicToken,
        presenterToken: state.presenterToken,
        sessionId: state.sessionId,
        convexUrl: state.convexUrl,
        simulatorTotalSlides: state.simulatorTotalSlides,
        simulatorAutoAdvanceMs: state.simulatorAutoAdvanceMs,
      }),
    }
  )
);
