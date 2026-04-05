/**
 * Auth store – local UI state for presenter authentication.
 * The auth token is the bridge to Convex; presenter identity lives in Convex.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  token: string | null;
  presenterName: string | null;
  presenterEmail: string | null;
  isLoading: boolean;
  setAuth: (token: string, name?: string, email?: string) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      presenterName: null,
      presenterEmail: null,
      isLoading: false,
      setAuth: (token, name, email) =>
        set({ token, presenterName: name ?? null, presenterEmail: email ?? null }),
      clearAuth: () =>
        set({ token: null, presenterName: null, presenterEmail: null }),
      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: "slide-handout-auth",
      partialize: (state) => ({
        token: state.token,
        presenterName: state.presenterName,
        presenterEmail: state.presenterEmail,
      }),
    }
  )
);
