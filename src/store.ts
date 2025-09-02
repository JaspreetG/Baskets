import { create } from "zustand";

// --- Basket and Portfolio Types ---
export interface BasketStock {
  sell_time?: string | null;
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
  removeBasketStock: (symbol: string) => void;
  baskets: Basket[];
  setBaskets: (baskets: Basket[]) => void;
  updateBasketLTP: (basketId: string, symbol: string, ltp: number) => void;
  dashboardHasMounted?: boolean;
  setDashboardHasMounted: (mounted: boolean) => void;
}

export const globalStore = create<GlobalStore>((set) => ({
  basketStocks: [],
  addBasketStock: (stock) =>
    set((state) => {
      // normalize symbol to avoid case/whitespace duplicates
      const symbol = stock.symbol.trim().toUpperCase();
      const newStock: BasketStock = {
        ...stock,
        symbol,
        name: stock.name ?? "",
      };
      // Build a map to ensure uniqueness by symbol (last write wins)
      const map = new Map<string, BasketStock>();
      state.basketStocks.forEach((s) =>
        map.set(s.symbol.trim().toUpperCase(), s),
      );
      map.set(symbol, newStock);
      return { basketStocks: Array.from(map.values()) };
    }),
  removeBasketStock: (symbol) =>
    set((state) => {
      const key = symbol.trim().toUpperCase();
      return {
        basketStocks: state.basketStocks.filter(
          (s) => s.symbol.trim().toUpperCase() !== key,
        ),
      };
    }),
  baskets: [],
  setBaskets: (baskets) =>
    set(() => {
      const out: Basket[] = [];
      for (const b of baskets) {
        const stocks: BasketStock[] = [];
        for (const s of b.stocks) {
          stocks.push({ ...s, sell_date: s.sell_time ?? s.sell_date ?? null });
        }
        out.push({ ...b, stocks });
      }
      return { baskets: out };
    }),
  updateBasketLTP: (basketId, symbol, ltp) =>
    set((state) => {
      const newBaskets: Basket[] = [];
      for (const b of state.baskets) {
        if (b.id !== basketId) {
          newBaskets.push(b);
          continue;
        }
        const newStocks: BasketStock[] = [];
        for (const s of b.stocks) {
          if (s.symbol === symbol) newStocks.push({ ...s, ltp });
          else newStocks.push(s);
        }
        newBaskets.push({ ...b, stocks: newStocks });
      }
      return { baskets: newBaskets };
    }),
  dashboardHasMounted: false,
  setDashboardHasMounted: (mounted: boolean) =>
    set({ dashboardHasMounted: mounted }),
}));
