import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FaChevronLeft,
  FaRupeeSign,
  FaBox,
  FaMoneyBillWave,
  FaChartBar,
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
        <div className="mb-8">
          <h2 className="mb-3 text-3xl font-bold tracking-tight text-slate-900 font-heading">
            Configure Your Basket
          </h2>
          <p className="text-base text-slate-500 font-medium leading-relaxed max-w-xl">
            Name your new investment basket and specify your total investment amount. We'll automatically distribute the funds optimally across your chosen stocks.
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
          <div className="mb-10 space-y-6 rounded-[2rem] bg-white p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-200/50">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <label
                htmlFor="basketName"
                className="flex w-full md:w-[160px] items-center gap-2.5 text-sm font-bold text-slate-700 uppercase tracking-widest"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                  <FaBox size={14} />
                </div>
                Name
              </label>
              <Input
                id="basketName"
                type="text"
                placeholder="e.g. Long Term Tech"
                value={basketName}
                onChange={(e) => setBasketName(e.target.value)}
                className="flex-1 rounded-[1rem] border border-slate-200/60 bg-slate-50/50 px-5 py-6 text-lg placeholder:text-slate-400 focus:bg-white focus:border-primary-400 focus:ring-4 focus:ring-primary-400/20 focus:shadow-[0_0_30px_rgba(59,130,246,0.15)] transition-all shadow-inner"
              />
            </div>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <label
                htmlFor="amount"
                className="flex w-full md:w-[160px] items-center gap-2.5 text-sm font-bold text-slate-700 uppercase tracking-widest"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <FaMoneyBillWave size={14} />
                </div>
                Investment
              </label>
              <div className="relative w-full md:flex-1">
                <FaRupeeSign className="absolute top-1/2 left-5 -translate-y-1/2 text-slate-400" />
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter amount (₹)"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-[1rem] border border-slate-200/60 bg-slate-50/50 py-6 pl-12 pr-5 text-lg placeholder:text-slate-400 focus:bg-white focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/20 focus:shadow-[0_0_30px_rgba(16,185,129,0.15)] transition-all font-semibold tabular-nums shadow-inner"
                />
              </div>
            </div>
          </div>

          {stocks.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600 ring-1 ring-orange-100/50">
                  <FaChartBar size={18} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 font-heading">
                  Allocation Preview
                </h3>
              </div>
              
              <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.03)] ring-1 ring-slate-200/50">
                <div className="overflow-x-auto">
                  <table className="min-w-full table-auto">
                    <thead className="bg-slate-50/80 border-b border-slate-100">
                      <tr className="text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                        <th className="px-6 py-4">Symbol</th>
                        <th className="px-6 py-4 text-center">Qty</th>
                        <th className="px-6 py-4 text-center">Unit Price</th>
                        <th className="px-6 py-4 text-right">Allocation</th>
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
                            <td className="px-6 py-5">
                              <div className="text-base font-bold text-slate-900 font-heading">
                                {stock.code}
                              </div>
                              {stock.name && stock.name !== stock.code && (
                                <div className="mt-0.5 max-w-[180px] truncate text-[13px] text-slate-500 font-normal">
                                  {stock.name}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-5 text-center tabular-nums text-base">
                              <span className="inline-flex items-center justify-center min-w-[2rem] rounded-md bg-slate-100 px-2.5 py-1 text-slate-800 font-semibold ring-1 ring-slate-200/50">
                                {quantity}
                              </span>
                            </td>
                            <td className="px-6 py-5 text-center tabular-nums text-slate-600">
                              ₹{ltp.toFixed(2)}
                            </td>
                            <td className="px-6 py-5 text-right tabular-nums">
                              <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-bold text-primary-700 ring-1 ring-primary-200/50">
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
              <div className="flex flex-col items-center justify-center gap-4 rounded-[2rem] border-2 border-dashed border-slate-200 bg-slate-50/50 px-6 py-16 text-center shadow-sm">
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
            <div className="flex items-center justify-between rounded-[1.5rem] bg-white p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] ring-1 ring-slate-200/60">
              <span className="flex items-center gap-3 text-sm font-bold uppercase tracking-widest text-slate-600">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                  <FaBoxOpen size={16} />
                </div>
                Total Value
              </span>
              <span className="text-3xl font-bold text-slate-900 tabular-nums">
                ₹{total.toFixed(2)}
              </span>
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
