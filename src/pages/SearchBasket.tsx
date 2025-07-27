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
    <div className="mx-auto w-full max-w-2xl px-6 text-gray-700 md:px-8">
      <section className="mb-8 space-y-4">
        {/* Header */}
        <div className="mt-3 mb-6 flex items-center justify-start">
          <Link
            to="/"
            className="mt-1 flex items-center gap-2 text-base text-gray-500 hover:text-gray-700"
          >
            <FaChevronLeft className="h-4 w-4" />
            <span className="text-base text-gray-500">Add Stocks</span>
          </Link>
        </div>
        <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-800">
          <span className="text-blue-600">
            <FaSearch className="inline-block h-5 w-5" />
          </span>
          Find & Add Stocks
        </h2>
        <p className="text-sm text-gray-500">
          Search your favorite companies and tap the{" "}
          <strong className="text-blue-600">+</strong> button to add them to
          your basket. When you’re ready, hit{" "}
          <strong className="text-blue-600">Done</strong> below to continue.
        </p>

        {/* Search Bar */}
        <div className="relative">
          <FaSearch className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Search your favorite stocks..."
            className="w-full rounded-lg border border-gray-200 bg-white py-3 pr-4 pl-12 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
            }}
          />
        </div>
      </section>

      {/* Stock List */}
      <ul className="relative z-20 divide-y divide-gray-200 overflow-hidden rounded-xl bg-white shadow-md">
        {(data ?? []).map((stock: Stock) => {
          const selected = isStockSelected(stock.ticker);
          return (
            <li
              key={stock.ticker}
              className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-gray-50"
            >
              <div className="flex-1">
                <div className="text-sm font-semibold text-gray-700">
                  {stock.ticker}
                </div>
                <div className="text-xs leading-snug text-gray-500">
                  {stock.title}
                </div>
              </div>
              <Button
                size="sm"
                variant={selected ? undefined : "ghost"}
                className={
                  selected
                    ? "border border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
                    : "font-medium text-blue-600 transition-colors hover:text-blue-700"
                }
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
                      `${stock.ticker} (${stock.title}) added to basket!`,
                    );
                  } else {
                    // Remove from basket
                    globalStore.getState().removeBasketStock(stock.ticker);
                    toast.success(
                      `${stock.ticker} (${stock.title}) removed from basket!`,
                    );
                  }
                }}
              >
                <Plus className={selected ? "h-4 w-4 text-white" : "h-4 w-4"} />
              </Button>
            </li>
          );
        })}
      </ul>
      {/* Sticky Done Button */}
      <div className="pointer-events-none fixed bottom-6 left-0 z-10 w-full px-6 md:px-8">
        <div className="pointer-events-auto mx-auto max-w-2xl">
          <Link to="/invest">
            <Button className="mb-10 inline-flex h-[40px] w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700">
              <FaCheckCircle className="h-4 w-4" />
              Done
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
