import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { FaArrowLeft } from "react-icons/fa";
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
    <motion.div
      className="mx-auto w-full max-w-2xl px-6 pt-6 text-gray-700 md:px-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeInOut" }}
    >
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2 text-base font-medium text-gray-500"
        >
          <FaArrowLeft className="h-4 w-4" />
          <span>Add Stocks</span>
        </Link>
        <Link to="/invest">
          <Button
            variant="default"
            className="h-auto bg-blue-600 px-6 py-2 text-base font-semibold text-white shadow hover:bg-blue-700 focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:outline-none"
          >
            Done
          </Button>
        </Link>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          type="text"
          placeholder="Search for stocks..."
          className="w-full rounded-lg border border-gray-300 bg-white px-12 py-5 text-lg text-gray-800 shadow-md placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-300 focus:outline-none"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
          }}
        />
      </div>

      {/* Stock List */}
      <ul className="divide-y divide-gray-200 overflow-hidden rounded-xl bg-white shadow-md">
        {(data ?? []).map((stock: Stock, idx: number) => {
          const selected = isStockSelected(stock.ticker);
          return (
            <motion.li
              key={stock.ticker}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{
                duration: 0.25,
                delay: idx * 0.03,
                ease: "easeOut",
              }}
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
                    : "text-blue-600 hover:text-blue-700"
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
            </motion.li>
          );
        })}
      </ul>
    </motion.div>
  );
}
