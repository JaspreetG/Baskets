import { create } from "zustand";

// --- Basket and Portfolio Types ---
export interface BasketStock {
  symbol: string;
  name: string;
  quantity: number;
  buy_price: number;
  sell_price?: number | null;
  sell_date?: string | null;
  ltp?: number; // latest price
}

export interface Basket {
  id: string;
  name: string;
  created_at: string;
  stocks: BasketStock[];
  netValue?: number;
  invested?: number;
  returns?: number;
  xirr?: number;
}

interface GlobalStore {
  basketStocks: BasketStock[];
  addBasketStock: (stock: BasketStock) => void;
  baskets: Basket[];
  setBaskets: (baskets: Basket[]) => void;
  updateBasketLTP: (basketId: string, symbol: string, ltp: number) => void;
}

export const globalStore = create<GlobalStore>((set) => ({
  basketStocks: [],
  addBasketStock: (stock) =>
    set((state) => ({ basketStocks: [...state.basketStocks, stock] })),
  baskets: [],
  setBaskets: (baskets) => set({ baskets }),
  updateBasketLTP: (basketId, symbol, ltp) =>
    set((state) => ({
      baskets: state.baskets.map((b) =>
        b.id === basketId
          ? {
              ...b,
              stocks: b.stocks.map((s) =>
                s.symbol === symbol ? { ...s, ltp } : s,
              ),
            }
          : b,
      ),
    })),
}));
