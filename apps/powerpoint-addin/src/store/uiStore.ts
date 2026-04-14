import { create } from "zustand";

interface AddinUiState {
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
}

export const useAddinUiStore = create<AddinUiState>((set) => ({
  isSettingsOpen: false,
  setIsSettingsOpen: (isSettingsOpen) => set({ isSettingsOpen }),
}));