import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { FaSearch, FaCheckCircle } from "react-icons/fa";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/lib/useDebounce";
import { globalStore } from "@/store";
import { toast } from "sonner";

export default function SearchBasket() {
  const hasMounted = useRef(false);

  useEffect(() => {
    hasMounted.current = true;
  }, []);

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 400);

  const { data } = useQuery({
    queryKey: ["search", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim()) return [];
      const res = await fetch(
        `https://zmvzrrggaergcqytqmil.supabase.co/functions/v1/search-api?q=${encodeURIComponent(debouncedQuery)}`,
        {
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        },
      );
      return res.json();
    },
    enabled: debouncedQuery.trim().length > 0,
  });

  type Stock = {
    ticker: string;
    title: string;
  };

  // Get selected stocks from zustand
  const basketStocks = globalStore((state) => state.basketStocks);
  const isStockSelected = (ticker: string) =>
    basketStocks.some((s) => s.symbol === ticker);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10 relative z-10">
        <div className="mb-8 sm:mb-12 flex items-center justify-between">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-slate-900 font-heading">
              Search.
            </h1>
            <p className="text-sm sm:text-base font-medium text-slate-500 mt-1">
              Find assets to build your basket.
            </p>
          </div>
          <Link
            to="/"
            className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center shrink-0 rounded-full bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_4px_20px_rgba(0,0,0,0.03)] text-slate-500 transition-all hover:bg-white/80 hover:text-slate-900 hover:-translate-y-0.5"
            title="Back to Dashboard"
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </Link>
        </div>
        <p className="text-base text-slate-500 leading-relaxed font-medium">
          Search your favorite companies and tap the{" "}
          <strong className="font-bold text-primary-600">+</strong> button to add them to
          your basket. When you’re ready, hit <strong className="font-bold text-primary-600">Dashboard</strong> to go back.
        </p>

        <div className="sticky top-0 z-20 -mx-4 mb-6 bg-transparent px-4 py-4 backdrop-blur-2xl sm:static sm:mx-0 sm:bg-transparent sm:p-0">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-5 sm:pl-6">
              <FaSearch className="h-5 w-5 sm:h-6 sm:w-6 text-slate-400" />
            </div>
            <Input
              type="text"
              placeholder="Search symbols or company names..."
              className="w-full rounded-full border border-white/80 bg-white/60 py-5 sm:py-6 pr-6 pl-14 sm:pl-16 text-[16px] sm:text-lg font-bold text-slate-900 shadow-[0_12px_40px_rgba(0,0,0,0.06)] backdrop-blur-3xl placeholder:text-slate-400 focus:bg-white/90 focus:border-white focus:ring-4 focus:ring-white/50 focus:outline-none transition-all"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
              }}
            />
          </div>
        </div>

      {/* Stock List */}
      <ul className="relative z-20 space-y-3 pb-32">
        {(data ?? []).map((stock: Stock) => {
          const selected = isStockSelected(stock.ticker);
          return (
            <li
              key={stock.ticker}
              className="flex items-center justify-between rounded-2xl bg-white/60 backdrop-blur-xl p-3 sm:p-4 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-white/50 transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.05)] hover:bg-white/80"
            >
              <div className="flex-1 min-w-0 pr-3 sm:pr-4">
                <div className="text-sm sm:text-base font-extrabold text-slate-900 font-heading">
                  {stock.ticker}
                </div>
                <div className="truncate text-xs sm:text-sm font-medium text-slate-500">
                  {stock.title}
                </div>
              </div>
              <Button
                size="sm"
                variant={selected ? undefined : "outline"}
                className={`h-10 w-10 shrink-0 rounded-full p-0 transition-all ${
                  selected
                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-600 border-none ring-0"
                    : "border border-slate-200 bg-white text-slate-400 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600"
                }`}
                onClick={async () => {
                  if (!selected) {
                    // Add to basket
                    let ltp = 0;
                    try {
                      const res = await fetch(
                        `https://zmvzrrggaergcqytqmil.supabase.co/functions/v1/ltp-api?symbol=${stock.ticker}`,
                        {
                          headers: {
                            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                          },
                        },
                      );
                      const data = await res.json();
                      ltp = typeof data?.ltp === "number" ? data.ltp : 0;
                    } catch {
                      toast.error(`Could not fetch price for ${stock.ticker}. Adding with price 0.`);
                    }
                    globalStore.getState().addBasketStock({
                      symbol: stock.ticker,
                      name: stock.title,
                      quantity: 0,
                      buy_price: ltp,
                      ltp: ltp,
                      sell_price: null,
                      sell_date: null,
                    });
                    toast.success(
                      `${stock.ticker} added to basket!`,
                    );
                  } else {
                    // Remove from basket
                    globalStore.getState().removeBasketStock(stock.ticker);
                    toast.success(
                      `${stock.ticker} removed from basket!`,
                    );
                  }
                }}
              >
                {selected ? (
                  <FaCheckCircle className="h-5 w-5" />
                ) : (
                  <Plus className="h-5 w-5" />
                )}
              </Button>
            </li>
          );
        })}
        {query.trim().length > 0 && (data ?? []).length === 0 && (
          <div className="py-12 text-center text-slate-500 font-medium">
            No stocks found matching "{query}".
          </div>
        )}
      </ul>
      
      {/* Sticky Done Button */}
      <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-slate-50 via-slate-50/90 to-transparent pb-6 pt-12 px-4 md:px-8">
        <div className="pointer-events-auto mx-auto max-w-2xl">
          <Link to="/invest" className="block w-full">
            <Button className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary-600 text-[15px] font-bold text-white shadow-[0_8px_20px_rgba(59,130,246,0.25)] transition-all hover:-translate-y-0.5 hover:bg-primary-500 hover:shadow-[0_12px_25px_rgba(59,130,246,0.35)]">
              <FaCheckCircle className="h-4 w-4" />
              Review & Configure Basket
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
