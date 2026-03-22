import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FaChevronLeft,
  FaRupeeSign,
  FaBoxOpen,
} from "react-icons/fa";
import { useEffect, useRef, useState } from "react";
import { useDebounce } from "@/lib/useDebounce";
import { useMutation } from "@tanstack/react-query";
import type { PostgrestSingleResponse } from "@supabase/postgrest-js";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { globalStore } from "@/store";
import { toast } from "sonner";

export default function InvestBasket() {
  const hasMounted = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    hasMounted.current = true;
  }, []);

  const basketStocks = globalStore((state) => state.basketStocks);

  const [basketName, setBasketName] = useState("");
  const [amount, setAmount] = useState("");
  // Debounce amount input to avoid immediate calculations (using custom hook)
  const debouncedAmount = useDebounce(amount, 400);

  // Use all BasketStock fields for calculation
  const stocks = basketStocks.map((s) => ({
    code: s.symbol,
    name: s.name,
    ltp: s.ltp ?? s.buy_price ?? 0,
    buy_price: s.buy_price,
    quantity: s.quantity,
  }));

  // Parse amount as a number safely for calculations
  const parsedAmount = parseFloat(debouncedAmount) || 0;

  const distributedStocks = (() => {
    const n = stocks.length;
    if (n === 0 || parsedAmount <= 0) return [];

    const baseAmount = parsedAmount / n;
    const allocated = stocks.map((s) => {
      const ltp = Number(s.ltp) || 0;
      const quantity = ltp > 0 ? Math.floor(baseAmount / ltp) : 0;
      return {
        ...s,
        ltp: Number(ltp.toFixed(2)),
        buy_price: Number(ltp.toFixed(2)),
        quantity,
        cost: quantity * ltp,
      };
    });

    let remaining =
      parsedAmount - allocated.reduce((acc, s) => acc + s.cost, 0);

    while (remaining > 0.01) {
      // Sort by lowest allocation first
      allocated.sort((a, b) => a.quantity * a.ltp - b.quantity * b.ltp);
      let allocatedFlag = false;

      for (let i = 0; i < n; i++) {
        const stock = allocated[i];
        if (stock.ltp <= 0) continue;
        if (remaining >= stock.ltp) {
          stock.quantity += 1;
          stock.cost += stock.ltp;
          remaining -= stock.ltp;
          allocatedFlag = true;
          break;
        }
      }

      if (!allocatedFlag) break;
    }

    return allocated;
  })();

  const total = distributedStocks.reduce(
    (acc, s) => acc + s.quantity * (Number(s.ltp) || 0),
    0,
  );

  // React Query mutation for investing
  type InvestStock = {
    code: string;
    name: string;
    quantity: number;
    ltp: number;
  };
  type InvestParams = { basketName: string; distributedStocks: InvestStock[] };
  const investMutation = useMutation({
    mutationFn: async (params: InvestParams) => {
      return await supabase.rpc("create_basket_with_stocks", {
        basket_name: params.basketName,
        stock_list: params.distributedStocks.map((s: InvestStock) => ({
          symbol: s.code,
          name: s.name,
          quantity: s.quantity,
          buy_price: s.ltp,
        })),
      });
    },
    onSuccess: (data: PostgrestSingleResponse<unknown>) => {
      if (!data.error) {
        toast.success("Investment successful!");
        // Clear basketStocks in zustand/globalStore before navigating
        globalStore.setState({ basketStocks: [] });
        navigate("/");
      } else {
        toast.error("Investment failed. Please try again.");
      }
    },
    onError: () => {
      toast.error("Investment failed. Please try again.");
    },
  });

  return (
    <div className="flex flex-col justify-between text-slate-800">
      {/* Header */}
      <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8 space-y-8">
        <div className="mb-4 flex items-center justify-between">
          <Link
            to="/search"
            className="flex h-10 items-center justify-center w-fit gap-2 rounded-full bg-slate-100 px-4 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-200 hover:text-slate-900 hover:shadow-sm"
          >
            <FaChevronLeft className="h-3.5 w-3.5" />
            <span>Find Stocks</span>
          </Link>
        </div>
        <div className="mb-6 sm:mb-8">
          <h2 className="mb-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-heading">
            Configure Your Basket
          </h2>
          <p className="text-sm sm:text-base text-slate-500">
            Determine the custom distribution logic for exactly how your funds will be invested.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!basketName.trim() || !parsedAmount || total <= 0) {
              toast.error("Please enter a valid basket name and amount.");
              return;
            }
            investMutation.mutate({ basketName, distributedStocks });
          }}
        >
            <div className="mb-8 space-y-6 rounded-[2.5rem] bg-white/70 backdrop-blur-3xl p-5 sm:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-white/80">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="basketName"
                  className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest pl-1"
                >
                  Basket Name
                </label>
                <Input
                  id="basketName"
                  type="text"
                  placeholder="e.g. Long Term Tech"
                  value={basketName}
                  onChange={(e) => setBasketName(e.target.value)}
                  className="w-full rounded-2xl border border-white/50 bg-white/40 backdrop-blur-md px-4 py-3.5 sm:py-4 text-sm sm:text-base placeholder:text-slate-400 focus:bg-white/80 focus:border-blue-400 focus:ring-4 focus:ring-blue-400/20 focus:shadow-[0_0_30px_rgba(59,130,246,0.15)] transition-all shadow-sm"
                />
              </div>
              
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="amount"
                  className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest pl-1"
                >
                  Investment Amount
                </label>
                <div className="relative w-full">
                  <FaRupeeSign className="absolute top-1/2 left-4 -translate-y-1/2 text-slate-400 text-sm" />
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-2xl border border-white/50 bg-white/40 backdrop-blur-md pl-10 pr-4 py-3.5 sm:py-4 text-sm sm:text-base font-medium tabular-nums placeholder:text-slate-400 focus:bg-white/80 focus:border-blue-400 focus:ring-4 focus:ring-blue-400/20 focus:shadow-[0_0_30px_rgba(59,130,246,0.15)] transition-all shadow-sm"
                  />
                </div>
              </div>
            </div>

          {stocks.length > 0 && (
            <div className="space-y-6">
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 font-heading pl-1">
                Allocation Preview
              </h3>
              
              <div className="overflow-x-auto rounded-[2.5rem] bg-white/60 backdrop-blur-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-white/60">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px] sm:text-xs text-slate-500 font-medium whitespace-nowrap">
                    <thead className="bg-slate-50/80 border-b border-slate-100">
                      <tr className="text-left text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
                        <th className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">Symbol</th>
                        <th className="px-2 sm:px-6 py-3 sm:py-4 text-center whitespace-nowrap">Qty</th>
                        <th className="px-2 sm:px-6 py-3 sm:py-4 text-center whitespace-nowrap">Price</th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-right whitespace-nowrap">Alloc</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-sm font-medium text-slate-700">
                      {stocks.map((stock, idx) => {
                        const dist = distributedStocks.find(
                          (s) => s.code === stock.code,
                        );
                        const quantity = dist
                          ? dist.quantity
                          : (stock.quantity ?? 0);
                        const ltp = Number(stock.ltp) || 0;
                        const allocation =
                          total > 0 ? ((quantity * ltp) / total) * 100 : 0;

                        return (
                          <tr
                            key={stock.code + "-" + idx}
                            className="bg-white transition-colors hover:bg-slate-50/50"
                          >
                            <td className="px-3 sm:px-6 py-3 sm:py-4">
                              <div className="text-sm sm:text-base font-bold text-slate-900 font-heading max-w-[80px] sm:max-w-[none] truncate">
                                {stock.code}
                              </div>
                              {stock.name && stock.name !== stock.code && (
                                <div className="mt-0.5 max-w-[80px] sm:max-w-[140px] truncate text-[11px] sm:text-[13px] text-slate-500 font-normal">
                                  {stock.name}
                                </div>
                              )}
                            </td>
                            <td className="px-2 sm:px-6 py-3 sm:py-4 text-center tabular-nums text-sm sm:text-base">
                              <span className="inline-flex items-center justify-center min-w-[1.5rem] sm:min-w-[2rem] rounded-md bg-slate-100 px-1.5 sm:px-2.5 py-0.5 sm:py-1 text-slate-800 font-semibold ring-1 ring-slate-200/50">
                                {quantity}
                              </span>
                            </td>
                            <td className="px-2 sm:px-6 py-3 sm:py-4 text-center tabular-nums text-xs sm:text-sm text-slate-600 whitespace-nowrap">
                              ₹{ltp.toFixed(2)}
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 text-right tabular-nums whitespace-nowrap">
                              <span className="rounded pl-1.5 pr-1.5 py-0.5 text-[10px] sm:text-xs font-bold text-primary-700 bg-primary-50">
                                {allocation.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="rounded-[1.5rem] bg-slate-50 p-5 text-center text-sm font-medium text-slate-500 ring-1 ring-slate-200/50">
                Purchase these allocations via your preferred broker, then tap below to start tracking.
              </div>
            </div>
          )}

          {stocks.length === 0 && (
            <div className="mt-8">
              <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-5 sm:px-6 py-10 sm:py-16 text-center shadow-sm">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/50 text-slate-400">
                  <FaBoxOpen size={28} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 font-heading">Your basket is empty</h3>
                  <p className="mt-1 text-sm text-slate-500">Go back and search for stocks to add them here.</p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-12 mb-24 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-[2.5rem] bg-black/80 backdrop-blur-2xl text-white p-6 shadow-[0_12px_40px_rgba(0,0,0,0.2)] border border-white/10 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 mix-blend-overlay"></div>
              <div className="relative z-10 w-full flex flex-col sm:flex-row items-start sm:items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-slate-300 mb-1 sm:mb-0">
                  Total Value
                </span>
                <span className="text-2xl sm:text-3xl font-extrabold tabular-nums font-heading">
                  ₹{total.toFixed(2)}
                </span>
              </div>
            </div>

            <Button
              type="submit"
              disabled={
                investMutation.status === "pending" ||
                distributedStocks.length === 0 ||
                total <= 0
              }
              className="w-full rounded-full bg-primary-600 px-6 py-6 text-[17px] font-bold text-white shadow-[0_8px_25px_rgba(59,130,246,0.25)] transition-all hover:-translate-y-0.5 hover:bg-primary-500 hover:shadow-[0_12px_30px_rgba(59,130,246,0.35)] disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {(() => {
                if (investMutation.status === "pending") return "Processing Investment...";
                if (distributedStocks.length === 0 || total <= 0)
                  return "Add stocks to invest";
                return "Confirm Investment Details";
              })()}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
