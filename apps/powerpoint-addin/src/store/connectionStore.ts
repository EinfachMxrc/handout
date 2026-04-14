import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AddinMode, SyncStatus } from "./types";

interface AddinConnectionState {
  // Persisted configuration
  sessionPublicToken: string;
  presenterToken: string;
  sessionId: string;
  convexUrl: string;

  // Runtime connection status
  mode: AddinMode;
  syncStatus: SyncStatus;
  isOfficeAvailable: boolean;
  lastKnownSlide: number;
  connectionError: string | null;
  isSyncing: boolean;

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
  resetRuntime: () => void;
}

const initialRuntimeState = {
  mode: "disconnected" as AddinMode,
  syncStatus: "manual_only" as SyncStatus,
  isOfficeAvailable: false,
  lastKnownSlide: 1,
  connectionError: null,
  isSyncing: false,
};

export const useAddinConnectionStore = create<AddinConnectionState>()(
  persist(
    (set) => ({
      sessionPublicToken: "",
      presenterToken: "",
      sessionId: "",
      convexUrl: "",

      ...initialRuntimeState,

      setConnectionInfo: (info) => set((state) => ({ ...state, ...info })),
      setMode: (mode) => set({ mode }),
      setSyncStatus: (syncStatus) => set({ syncStatus }),
      setOfficeAvailable: (isOfficeAvailable) => set({ isOfficeAvailable }),
      setLastKnownSlide: (lastKnownSlide) => set({ lastKnownSlide }),
      setConnectionError: (connectionError) => set({ connectionError }),
      setIsSyncing: (isSyncing) => set({ isSyncing }),
      resetRuntime: () => set(initialRuntimeState),
    }),
    {
      name: "slide-handout-addin",
      partialize: (state) => ({
        sessionPublicToken: state.sessionPublicToken,
        presenterToken: state.presenterToken,
        sessionId: state.sessionId,
        convexUrl: state.convexUrl,
      }),
    }
  )
);