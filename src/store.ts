import { create } from "zustand";

interface BasketStock {
  symbol: string;
  name: string;
  ltp: number;
}

interface GlobalStore {
  basketStocks: BasketStock[];
  addBasketStock: (stock: BasketStock) => void;
}

export const globalStore = create<GlobalStore>((set) => ({
  basketStocks: [],
  addBasketStock: (stock) =>
    set((state) => ({ basketStocks: [...state.basketStocks, stock] })),
}));
