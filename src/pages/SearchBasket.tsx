import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { FaArrowLeft } from "react-icons/fa";
import { Link, useNavigationType } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/lib/useDebounce";
import { globalStore } from "@/store";
import { toast } from "sonner";

export default function SearchBasket() {
  const navType = useNavigationType();
  const hasMounted = useRef(false);

  useEffect(() => {
    hasMounted.current = true;
  }, []);

  const isBack = navType === "POP";
  const shouldAnimate = !isBack && hasMounted.current;

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

  return (
    <motion.div
      className="mx-auto w-full max-w-2xl px-6 text-gray-700 md:px-8"
      initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
      animate={{ opacity: 1, y: 0 }}
      exit={shouldAnimate ? { opacity: 0, y: 20 } : {}}
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
            variant="ghost"
            className="h-auto px-4 py-1.5 text-base text-blue-600 hover:text-blue-700"
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
          className="w-full rounded-md border border-gray-300 bg-white px-10 py-3 text-base text-gray-800 shadow-sm placeholder:text-gray-400 focus:border-gray-500 focus:ring-2 focus:ring-gray-300 focus:outline-none"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
          }}
        />
      </div>

      {/* Stock List */}
      <ul className="divide-y divide-gray-200 overflow-hidden rounded-xl bg-white shadow-md">
        {(data ?? []).map((stock: Stock) => (
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
              variant="ghost"
              className="text-blue-600 hover:text-blue-700"
              onClick={async () => {
                const res = await fetch(
                  `https://zmvzrrggaergcqytqmil.supabase.co/functions/v1/ltp-api?symbol=${stock.ticker}`,
                  {
                    headers: {
                      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                    },
                  },
                );
                const data = await res.json();
                console.log("LTP API response for", stock.ticker, data);
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
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
