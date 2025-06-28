import { create } from "zustand";

interface GlobalStore {
  count: number;
  increment: () => void;
  decrement: () => void;
}

export const globalStore = create<GlobalStore>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
}));
