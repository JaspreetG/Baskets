import { Link } from "react-router-dom";
import { useCallback, useEffect, useMemo, memo } from "react";

import { supabase } from "@/lib/supabase";
import { LogOut } from "lucide-react";
import { globalStore } from "@/store";

// Helper to convert any date (string or Date) to IST ISO string (yyyy-mm-ddTHH:mm:ss.sssZ)
function toISTISOString(date: Date | string): string {
  return new Date(
    new Date(date).toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
  ).toISOString();
}

// Utility for XIRR calculation
// cashflows: array of { amount: number, date: string }, negative for investment, positive for return
// If no sell_date, use current date as end date
function calculateXIRR(cashflows: { amount: number; date: string }[]): number {
  if (cashflows.length < 2) return 0;
  // Ensure at least one positive and one negative cashflow
  const hasPositive = cashflows.some((c) => c.amount > 0);
  const hasNegative = cashflows.some((c) => c.amount < 0);
  if (!hasPositive || !hasNegative) return 0;

  // Convert all dates to ms (always in IST)
  const flows = cashflows.map((c) => ({
    amount: c.amount,
    date: new Date(c.date).getTime(),
  }));
  // Sort by date ascending
  flows.sort((a, b) => a.date - b.date);

  // Newton-Raphson method
  const maxIter = 100;
  const tol = 1e-6;
  let rate = 0.1;
  const days = (d1: number, d2: number) => (d2 - d1) / (1000 * 60 * 60 * 24);
  const xnpv = (r: number) =>
    flows.reduce(
      (acc, f) =>
        acc + f.amount / Math.pow(1 + r, days(flows[0].date, f.date) / 365),
      0,
    );
  const dxnpv = (r: number) =>
    flows.reduce(
      (acc, f) =>
        acc -
        ((days(flows[0].date, f.date) / 365) * f.amount) /
          Math.pow(1 + r, days(flows[0].date, f.date) / 365 + 1),
      0,
    );
  let iter = 0;
  while (iter++ < maxIter) {
    const f = xnpv(rate);
    const df = dxnpv(rate);
    if (!isFinite(f) || isNaN(f)) break;
    if (Math.abs(f) < tol) return rate * 100;
    if (df === 0) break;
    const newRate = rate - f / df;
    // Clamp rate: can't go below -0.99 (Math.pow breaks at -1)
    rate = Math.max(-0.99, Math.min(newRate, 10));
    if (!isFinite(rate) || isNaN(rate)) break;
  }
  // Final safety: if result is unreasonable, return 0
  if (!isFinite(rate) || isNaN(rate) || Math.abs(rate) > 10) return 0;
  return rate * 100;
}

const Dashboard = memo(function Dashboard() {
  const setBaskets = globalStore((s) => s.setBaskets);
  const updateBasketLTP = globalStore((s) => s.updateBasketLTP);
  const baskets = globalStore((s) => s.baskets);

  // --- Types ---
  type Stock = {
    symbol: string;
    name: string;
    ltp?: number;
    buy_price?: number;
    quantity?: number;
    sell_price?: number;
    sell_date?: string;
  };
  type Basket = {
    id: string | number;
    name: string;
    created_at?: string;
    stocks: Stock[];
  };

  // --- Fetch and set baskets and LTPs ---
  const fetchLTPForStock = useCallback(
    async (basketId: string, stock: Stock) => {
      try {
        const res = await fetch(
          `https://zmvzrrggaergcqytqmil.supabase.co/functions/v1/ltp-api?symbol=${stock.symbol}`,
          {
            headers: {
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
          },
        );
        const ltpData = await res.json();
        if (typeof ltpData?.ltp === "number") {
          updateBasketLTP(basketId, stock.symbol, ltpData.ltp);
        }
      } catch {
        // ignore
      }
    },
    [updateBasketLTP],
  );

  const fetchAndSetBaskets = useCallback(async () => {
    const { data } = await supabase.rpc("get_all_baskets_with_stocks");
    if (data && Array.isArray(data)) {
      setBaskets(data);
      await Promise.all(
        (data as Basket[]).map(async (basket) => {
          await Promise.all(
            basket.stocks
              .filter((stock) => {
                // Skip LTP fetch for already-exited stocks
                const exited =
                  stock.sell_price != null &&
                  typeof stock.sell_date === "string" &&
                  stock.sell_date.trim() !== "";
                return !exited;
              })
              .map(async (stock) =>
                fetchLTPForStock(String(basket.id), stock),
              ),
          );
        }),
      );
    }
  }, [setBaskets, fetchLTPForStock]);

  useEffect(() => {
    // Only update in background, don't block UI
    fetchAndSetBaskets();
    // No deps: only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debug: Log when fetchAndSetBaskets is called
  // (removed duplicate fetchAndSetBaskets declaration)

  // Calculate portfolio summary and cashflows robustly, only once, and memoize
  // Helper: is stock exited? (typed)
  const isExited = useCallback((stock: Stock): boolean => {
    return (
      stock.sell_price != null &&
      !isNaN(Number(stock.sell_price)) &&
      typeof stock.sell_date === "string" &&
      stock.sell_date.trim() !== "" &&
      !isNaN(Date.parse(stock.sell_date))
    );
  }, []);

  const { totalNetValue, totalInvested, totalReturn, xirr } = useMemo(() => {
    let netValue = 0;
    let invested = 0;
    let ret = 0;
    const cashflows: { amount: number; date: string }[] = [];
    (baskets as Basket[]).forEach((basket) => {
      let basketNet = 0;
      let basketInvested = 0;
      basket.stocks.forEach((stock) => {
        const qty = stock.quantity ?? 0;
        const buyPrice = stock.buy_price ?? 0;
        // Cashflow OUT: buy (always at basket.created_at)
        if (qty && buyPrice && basket.created_at) {
          cashflows.push({
            amount: -1 * qty * buyPrice,
            date: basket.created_at,
          });
        }
        if (qty > 0) {
          // Cashflow IN: sell or holding value
          if (isExited(stock)) {
            // Exited: use sell_price and sell_date
            const sellPrice = Number(stock.sell_price);
            const sellDate =
              typeof stock.sell_date === "string" &&
              stock.sell_date.trim() !== ""
                ? stock.sell_date
                : new Date().toISOString();
            if (sellPrice && sellDate) {
              cashflows.push({
                amount: qty * sellPrice,
                date: sellDate,
              });
            }
          } else {
            // Not exited: use LTP as sell price, today as sell date for XIRR
            const ltpOrBuy = Number(stock.ltp ?? stock.buy_price ?? 0);
            cashflows.push({
              amount: qty * ltpOrBuy,
              date: new Date().toISOString(),
            });
          }
          // Always include stock in invested/return totals (exited or not)
          const stockSellOrLtp = isExited(stock)
            ? Number(stock.sell_price)
            : Number(stock.ltp ?? stock.buy_price ?? 0);
          basketInvested += qty * buyPrice;
          basketNet += qty * stockSellOrLtp;
        }
      });
      netValue += basketNet;
      invested += basketInvested;
      ret += basketNet - basketInvested;
    });
    let xirr = 0;
    function fixExtremeXIRR(xirr: number): number {
      if (!isFinite(xirr) || Math.abs(xirr) > 1000) return 0;
      if (Object.is(xirr, -0) || Math.abs(xirr) < 0.005) return 0;
      return xirr;
    }
    if (cashflows.length > 1) {
      xirr = calculateXIRR(cashflows);
      xirr = fixExtremeXIRR(xirr);
    }
    return {
      totalNetValue: netValue,
      totalInvested: invested,
      totalReturn: ret,
      xirr,
    };
    // isExited is a stable function, but to satisfy lint, include it in deps
  }, [baskets, isExited]);

  return (
    <div className="min-h-screen pb-20">
      <div className="mx-auto max-w-5xl space-y-8 sm:space-y-12 px-4 py-8 sm:px-6 lg:px-8 sm:py-10 relative">
        {/* Apple Inline Header */}
        <div className="flex items-center justify-between px-1 sm:px-0">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tighter text-slate-900 font-heading">
            Portfolio.
          </h1>
          <button
            onClick={() => supabase.auth.signOut()}
            className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_4px_20px_rgba(0,0,0,0.03)] text-slate-500 transition-all hover:bg-white/80 hover:text-slate-900 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:-translate-y-0.5"
            title="Sign Out"
          >
            <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>

        {/* Portfolio Summary and Baskets Section */}
        <section className="space-y-4">
          <div className="relative">
            {/* Main Portfolio Top Card */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-white/70 backdrop-blur-3xl p-5 sm:p-8 md:p-10 shadow-[0_8px_40px_rgba(0,0,0,0.04)] border border-white/80">
              <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-400/10 blur-[80px] mix-blend-overlay"></div>
              
              {/* Header: Overall Holding Label and Value */}
              <div className="relative z-10 flex flex-col items-start gap-1 sm:gap-1.5">
                <h2 className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-slate-500">Portfolio Value</h2>
                          <div className="text-lg sm:text-xl font-extrabold text-slate-900 tabular-nums font-heading">
                            <span className="font-sans text-slate-400 mr-1 text-sm sm:text-base">₹</span>
                            {totalNetValue.toLocaleString()}
                          </div>
              </div>              {/* Invested, XIRR, Total Return */}
              <div className="flex flex-col sm:flex-row w-full gap-4 sm:gap-8 border-t border-slate-100 pt-5 sm:pt-8 relative z-10">
                {/* Invested */}
                <div className="flex items-center justify-between sm:block sm:flex-1 pb-4 sm:pb-0 border-b sm:border-b-0 border-slate-100 sm:space-y-1.5">
                  <div className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-slate-500">
                    Invested
                  </div>
                  <div className="text-sm sm:text-lg font-bold text-slate-800 tabular-nums font-heading">
                    ₹{totalInvested.toLocaleString()}
                  </div>
                </div>

                {/* XIRR */}
                <div className="flex items-center justify-between sm:block sm:flex-1 pb-4 sm:pb-0 border-b sm:border-b-0 border-slate-100 sm:border-l sm:pl-8 sm:space-y-1.5">
                  <div className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-slate-500">
                    XIRR
                  </div>
                  <div
                    className={`text-sm sm:text-lg font-bold tabular-nums font-heading ${
                      xirr >= 0.01
                        ? "text-emerald-600"
                        : xirr <= -0.01
                          ? "text-rose-500"
                          : "text-slate-600"
                    }`}
                  >
                    {(() => {
                      const displayXirr = xirr;
                      if (displayXirr >= 0.01)
                        return `+${displayXirr.toFixed(2)}%`;
                      if (displayXirr <= -0.01)
                        return `-${Math.abs(displayXirr).toFixed(2)}%`;
                      return "0.00%";
                    })()}
                  </div>
                </div>

                {/* Total Return */}
                <div className="flex items-center justify-between sm:block sm:flex-1 sm:border-l border-slate-100 sm:pl-8 sm:space-y-1.5">
                  <div className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-slate-500">
                    Total Return
                  </div>
                  <div className="flex items-center sm:items-baseline gap-2 text-right sm:text-left">
                    <div
                      className={`text-sm sm:text-lg font-bold tabular-nums font-heading ${
                        totalReturn > 0
                          ? "text-emerald-600"
                          : totalReturn < 0
                            ? "text-rose-500"
                            : "text-slate-600"
                      }`}
                    >
                      {totalReturn > 0 ? "+" : totalReturn < 0 ? "-" : ""}₹{Math.abs(totalReturn).toLocaleString()}
                    </div>
                    <div
                      className={`px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] uppercase tracking-wider font-bold ${
                        totalReturn > 0
                          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/50"
                          : totalReturn < 0
                            ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200/50"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {(() => {
                        const percent = totalInvested
                          ? (totalReturn / totalInvested) * 100
                          : 0;
                        if (percent >= 0.01) return `+${percent.toFixed(2)}%`;
                        if (percent <= -0.01)
                          return `-${Math.abs(percent).toFixed(2)}%`;
                        return "0.00%";
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Baskets Section */}
        <section className="mt-12 sm:mt-16 mb-20 space-y-6">
          <div className="flex items-center justify-between pb-4 sm:pb-5 border-b border-slate-900/10 mb-6 sm:mb-8">
            <div className="flex items-center gap-3 sm:gap-4">
              <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 font-heading">
                Baskets
              </h3>
              <span className="rounded-md bg-slate-100 px-2 sm:px-2.5 py-0.5 sm:py-1 text-[11px] sm:text-xs font-bold text-slate-500 ring-1 ring-slate-200/70 relative top-[1px]">{baskets.length} Total</span>
            </div>
            <Link
              to="/search"
              className="flex items-center gap-1.5 rounded-full bg-primary-600 px-4 sm:px-5 py-2 sm:py-2.5 text-[13px] sm:text-sm font-bold text-white shadow-[0_4px_15px_rgba(65,105,225,0.3)] transition-all hover:bg-primary-500 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(65,105,225,0.4)]"
            >
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>New Basket</span>
            </Link>
          </div>

          <div className="flex flex-col gap-3 sm:gap-4">
            {baskets.length > 0 ? (
              [...baskets]
                .sort((a, b) => {
                  const aDate = a.created_at ? new Date(toISTISOString(a.created_at)).getTime() : 0;
                  const bDate = b.created_at ? new Date(toISTISOString(b.created_at)).getTime() : 0;
                  return bDate - aDate;
                })
                .map((basket) => {
                  let basketInvested = 0;
                  let basketSellValue = 0;
                  // Always use basket.created_at so even brand new baskets show "Today"
                  const earliestDate: string | undefined = basket.created_at ?? undefined;

                  basket.stocks.forEach((stock) => {
                    const qty = stock.quantity ?? 0;
                    const buyPrice = stock.buy_price ?? 0;
                    basketInvested += qty * buyPrice;
                    const hasSell = stock.sell_price != null && !isNaN(Number(stock.sell_price)) && typeof stock.sell_date === "string" && stock.sell_date.trim() !== "";
                    const sellOrLtp = hasSell ? Number(stock.sell_price) : Number(stock.ltp ?? stock.buy_price ?? 0);
                    basketSellValue += qty * sellOrLtp;
                  });

                  let daysSince = 0;
                  if (earliestDate) {
                    const createdAtIST = new Date(toISTISOString(earliestDate));
                    const todayIST = new Date(new Date().toLocaleDateString("en-US", { timeZone: "Asia/Kolkata" }));
                    const diffMs = todayIST.getTime() - new Date(createdAtIST).setHours(0, 0, 0, 0);
                    daysSince = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
                  }

                  // CAGR calculation: ((endValue / beginValue) ^ (1 / years)) - 1
                  const yearsHeld = daysSince > 0 ? daysSince / 365 : 0;
                  const cagr = basketInvested > 0 && basketSellValue > 0 && yearsHeld > 0
                    ? (Math.pow(basketSellValue / basketInvested, 1 / yearsHeld) - 1) * 100
                    : null;

                  const totalReturn = basketSellValue - basketInvested;
                  const returnPct = basketInvested ? (totalReturn / basketInvested) * 100 : 0;
                  const isPositive = returnPct >= 0.01;
                  const isNegative = returnPct <= -0.01;
                  const returnColor = isPositive ? "text-emerald-600" : isNegative ? "text-rose-500" : "text-slate-500";
                  const sign = isPositive ? "+" : isNegative ? "-" : "";

                  return (
                    <Link
                      key={basket.id}
                      to={`/basket?id=${basket.id}`}
                      state={{ basketId: basket.id }}
                      className="group block w-full outline-none"
                    >
                      <div className="flex items-center justify-between rounded-[1.5rem] bg-white/60 backdrop-blur-2xl px-5 py-4 sm:px-6 sm:py-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-white/60 transition-all duration-300 hover:bg-white/90 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] active:-translate-y-0.5">
                        {/* Left: name + metadata */}
                        <div className="flex flex-col min-w-0 pr-4">
                          <span className="text-base sm:text-[17px] font-extrabold text-slate-900 font-heading truncate" title={basket.name}>
                            {basket.name}
                          </span>
                          <span className="text-[11px] sm:text-xs font-medium text-slate-500 mt-1">
                            {basket.stocks.length} stocks
                            <span className="mx-1 opacity-40">·</span>
                            Inv ₹{Math.round(basketInvested).toLocaleString()}
                            {daysSince > 0 && <><span className="mx-1 opacity-40">·</span>{daysSince}d</>}
                            {daysSince === 0 && earliestDate && <><span className="mx-1 opacity-40">·</span>Today</>}
                          </span>
                        </div>

                        {/* Right: value + return + cagr */}
                        <div className="flex flex-col items-end shrink-0">
                          <span className="text-base sm:text-[17px] font-black text-slate-900 tabular-nums font-heading tracking-tight">
                            ₹{Math.round(basketSellValue).toLocaleString()}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap justify-end">
                            <span className={`text-[11px] sm:text-xs font-bold tabular-nums ${returnColor}`}>
                              {sign}{Math.abs(returnPct).toFixed(1)}%
                            </span>
                            {cagr !== null && Math.abs(cagr) < 9999 && (
                              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 border-l border-slate-200 pl-1.5">
                                {cagr >= 0 ? "+" : ""}{cagr.toFixed(1)}% CAGR
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })
            ) : (
              <div className="col-span-1 md:col-span-2 flex flex-col items-center justify-center py-16">
                <div className="w-full max-w-md rounded-[2rem] border border-slate-100 bg-white px-10 py-12 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-200/50">
                  <div className="mb-6 flex justify-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary-50 ring-1 ring-primary-100 shadow-sm">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-primary-600" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                  </div>
                    <span className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 font-heading leading-tight">
                      Smarter Investing,<br />Effortless Portfolios.
                    </span>
                  <div className="mb-8 text-sm font-medium text-slate-500 leading-relaxed">
                    Start by creating your first investment basket to track your portfolio performance smoothly.
                  </div>
                  <Link
                    to="/search"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary-600 px-6 py-4 text-[15px] font-bold text-white shadow-[0_8px_20px_rgba(59,130,246,0.25)] transition-all hover:-translate-y-0.5 hover:bg-primary-500 hover:shadow-[0_12px_25px_rgba(59,130,246,0.35)] focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                  >
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className="-ml-1">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Create New Basket
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
});
export default Dashboard;
