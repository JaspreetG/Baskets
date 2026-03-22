import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { FaSearch, FaCheckCircle } from "react-icons/fa";
import { FaChevronLeft } from "react-icons/fa";
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
    <div className="mx-auto w-full max-w-2xl px-4 py-8 md:px-8">
      <section className="mb-10 space-y-4">
        {/* Header */}
        <div className="mb-8 flex items-center justify-start">
          <Link
            to="/"
            className="flex h-10 items-center justify-center gap-2 rounded-full bg-slate-100 px-4 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-200 hover:text-slate-900 hover:shadow-sm"
          >
            <FaChevronLeft className="h-3.5 w-3.5" />
            <span>Dashboard</span>
          </Link>
        </div>
        <h2 className="flex items-center gap-2 sm:gap-3 text-xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-heading">
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600 ring-1 ring-primary-100/50 shadow-sm">
            <FaSearch className="h-4 w-4" />
          </div>
          Find Stocks
        </h2>
        <p className="text-base text-slate-500 leading-relaxed font-medium">
          Search your favorite companies and tap the{" "}
          <strong className="font-bold text-primary-600">+</strong> button to add them to
          your basket. When you’re ready, hit{" "}
          <strong className="font-bold text-primary-600">Done</strong> below to proceed.
        </p>

        {/* Search Bar */}
        <div className="relative mt-8">
          <FaSearch className="pointer-events-none absolute top-1/2 left-5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="text"
            placeholder="Search symbols or company names..."
            className="w-full rounded-[1.5rem] border border-white/50 bg-white/50 py-4 sm:py-5 pr-4 sm:pr-5 pl-10 sm:pl-11 text-sm sm:text-base font-medium text-slate-800 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-2xl placeholder:text-slate-400 focus:bg-white/80 focus:border-blue-400 focus:ring-4 focus:ring-blue-400/20 focus:shadow-[0_0_30px_rgba(59,130,246,0.15)] focus:outline-none transition-all"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
            }}
          />
        </div>
      </section>

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
                    const res = await fetch(
                      `https://zmvzrrggaergcqytqmil.supabase.co/functions/v1/ltp-api?symbol=${stock.ticker}`,
                      {
                        headers: {
                          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                        },
                      },
                    );
                    const data = await res.json();
                    globalStore.getState().addBasketStock({
                      symbol: stock.ticker,
                      name: stock.title,
                      quantity: 0, // default, user will set in InvestBasket
                      buy_price: data.ltp, // treat ltp as buy price for now
                      ltp: data.ltp,
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
