import { Button } from "@/components/ui/button";
import { FaBoxOpen } from "react-icons/fa";
import { useState } from "react";
import { useDebounce } from "@/lib/useDebounce";
import { useMutation } from "@tanstack/react-query";
import type { PostgrestSingleResponse } from "@supabase/postgrest-js";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { globalStore } from "@/store";
import { toast } from "sonner";

export default function InvestBasket() {
  const navigate = useNavigate();

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

    let safetyCounter = 0;
    const maxIterations = n * 1000; // prevent infinite loop
    while (remaining > 0.01 && safetyCounter++ < maxIterations) {
      // Sort by lowest allocation first
      allocated.sort((a, b) => a.quantity * a.ltp - b.quantity * b.ltp);
      let allocatedFlag = false;

      for (let i = 0; i < n; i++) {
        const stock = allocated[i];
        if (stock.ltp <= 0 || !isFinite(stock.ltp)) continue;
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
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10 relative z-10">
        <div className="mb-8 sm:mb-12 flex items-center justify-between">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-slate-900 font-heading">
              Configure.
            </h1>
            <p className="text-sm sm:text-base font-medium text-slate-500 mt-1">
              Set target basket parameters.
            </p>
          </div>
          <Link
            to="/search"
            className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center shrink-0 rounded-full bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_4px_20px_rgba(0,0,0,0.03)] text-slate-500 transition-all hover:bg-white/80 hover:text-slate-900 hover:-translate-y-0.5"
            title="Back to Search"
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </Link>
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
            <div className="mb-10 overflow-hidden rounded-[2.5rem] bg-white/60 backdrop-blur-3xl shadow-[0_8px_40px_rgba(0,0,0,0.04)] border border-white/80">
              <div className="flex items-center px-6 py-5 sm:px-8 border-b border-slate-900/5 transition-colors focus-within:bg-white/40">
                <label htmlFor="basketName" className="w-24 sm:w-40 text-[11px] sm:text-[13px] font-bold uppercase tracking-widest text-slate-400 shrink-0">
                  Name
                </label>
                <input
                  id="basketName"
                  type="text"
                  placeholder="e.g. Long Term Tech"
                  value={basketName}
                  onChange={(e) => setBasketName(e.target.value)}
                  className="w-full bg-transparent text-[16px] sm:text-lg font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none"
                />
              </div>
              
              <div className="flex items-center px-6 py-5 sm:px-8 transition-colors focus-within:bg-white/40">
                <label htmlFor="amount" className="w-24 sm:w-40 text-[11px] sm:text-[13px] font-bold uppercase tracking-widest text-slate-400 shrink-0">
                  Investment
                </label>
                <div className="flex items-center flex-1">
                  <span className="text-slate-400 font-bold pr-1.5 sm:pr-2 text-[16px] sm:text-lg">₹</span>
                  <input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-transparent text-[16px] sm:text-lg font-bold tabular-nums text-slate-900 placeholder:text-slate-300 focus:outline-none"
                  />
                </div>
              </div>
            </div>

          {stocks.length > 0 && (
            <div className="space-y-6">
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 font-heading pl-1">
                Allocation Preview
              </h3>
              
              <div className="overflow-hidden rounded-[2.5rem] bg-white/60 backdrop-blur-3xl shadow-[0_8px_40px_rgba(0,0,0,0.04)] border border-white/80">
                <div className="divide-y divide-slate-900/5">
                  {stocks.map((stock, idx) => {
                    const dist = distributedStocks.find((s) => s.code === stock.code);
                    const quantity = dist ? dist.quantity : (stock.quantity ?? 0);
                    const ltp = Number(stock.ltp) || 0;
                    const allocation = total > 0 ? ((quantity * ltp) / total) * 100 : 0;

                    return (
                      <div key={stock.code + "-" + idx} className="flex items-center justify-between gap-4 px-5 py-4 sm:px-8 sm:py-5 hover:bg-white/40 transition-colors">
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm sm:text-base font-black tracking-tight text-slate-900 font-heading truncate">
                            {stock.code}
                          </span>
                          <span className="text-[11px] sm:text-xs font-medium text-slate-500 mt-0.5">
                            {quantity} shares · ₹{ltp.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex flex-col items-end shrink-0">
                          <span className="text-sm sm:text-base font-black text-slate-900 tabular-nums font-heading tracking-tight">
                            ₹{(quantity * ltp).toFixed(2)}
                          </span>
                          <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider">
                            {allocation.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
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

          <div className="mt-12 mb-24">
            <div className="relative overflow-hidden rounded-[2.5rem] bg-white/70 backdrop-blur-3xl border border-white/80 shadow-[0_12px_40px_rgba(0,0,0,0.06)] p-6 sm:p-10">
              
              <div className="flex items-center justify-between mb-8 sm:mb-10 border-b border-slate-900/5 pb-6 sm:pb-8">
                <span className="text-xs sm:text-sm font-bold uppercase tracking-widest text-slate-500">
                  Total Amount
                </span>
                <span className="text-3xl sm:text-4xl font-black tabular-nums font-heading tracking-tight text-slate-900">
                  <span className="text-slate-400 font-sans font-medium text-xl sm:text-2xl mr-1">₹</span>
                  {total.toFixed(2)}
                </span>
              </div>

              <Button
                type="submit"
                disabled={investMutation.status === "pending" || distributedStocks.length === 0 || total <= 0}
                className="w-full h-16 sm:h-[4.5rem] rounded-full bg-primary-600 text-white text-[17px] sm:text-xl font-black tracking-tight shadow-[0_8px_30px_rgba(65,105,225,0.25)] transition-all hover:bg-primary-500 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(65,105,225,0.35)] disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-[0_8px_30px_rgba(65,105,225,0.25)]"
              >
                {(() => {
                  if (investMutation.status === "pending") return "Processing...";
                  if (distributedStocks.length === 0 || total <= 0) return "Add stocks to invest";
                  return "Confirm Investment";
                })()}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
