import { create } from "zustand";

export interface AuthUser {
  id: string;
  email: string;
  provider: string;
  name?: string;
  avatar_url?: string;
}

interface AuthStore {
  user: AuthUser | null;
  loading: boolean;
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  isAuthenticated: () => !!get().user,
}));
