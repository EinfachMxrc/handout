import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AddinSimulatorState {
  simulatorTotalSlides: number;
  simulatorAutoAdvanceMs: number;
  setSimulatorConfig: (total: number, autoMs: number) => void;
}

export const useAddinSimulatorStore = create<AddinSimulatorState>()(
  persist(
    (set) => ({
      simulatorTotalSlides: 10,
      simulatorAutoAdvanceMs: 0,
      setSimulatorConfig: (simulatorTotalSlides, simulatorAutoAdvanceMs) =>
        set({ simulatorTotalSlides, simulatorAutoAdvanceMs }),
    }),
    {
      name: "slide-handout-addin-simulator",
      partialize: (state) => ({
        simulatorTotalSlides: state.simulatorTotalSlides,
        simulatorAutoAdvanceMs: state.simulatorAutoAdvanceMs,
      }),
    }
  )
);