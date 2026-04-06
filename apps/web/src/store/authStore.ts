/**
 * Auth store - local UI state for presenter authentication.
 * The auth token is the bridge to Convex; presenter identity lives in Convex.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  token: string | null;
  presenterName: string | null;
  presenterEmail: string | null;
  isDemo: boolean;
  isLoading: boolean;
  setAuth: (token: string, name?: string, email?: string, isDemo?: boolean) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      presenterName: null,
      presenterEmail: null,
      isDemo: false,
      isLoading: false,
      setAuth: (token, name, email, isDemo = false) =>
        set({
          token,
          presenterName: name ?? null,
          presenterEmail: email ?? null,
          isDemo,
        }),
      clearAuth: () =>
        set({
          token: null,
          presenterName: null,
          presenterEmail: null,
          isDemo: false,
        }),
      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: "slide-handout-auth",
      partialize: (state) => ({
        token: state.token,
        presenterName: state.presenterName,
        presenterEmail: state.presenterEmail,
        isDemo: state.isDemo,
      }),
    }
  )
);
