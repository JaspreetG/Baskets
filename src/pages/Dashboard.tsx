import { Link } from "react-router-dom";
import { useCallback, useEffect, useMemo, memo } from "react";

import { supabase } from "@/lib/supabase";
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
    if (Math.abs(f) < tol) return rate * 100;
    if (df === 0) break;
    rate = rate - f / df;
  }
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
        updateBasketLTP(basketId, stock.symbol, ltpData.ltp);
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
            basket.stocks.map(async (stock) =>
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
            // For invested/return/holding: do NOT include exited stocks
          } else {
            // Not exited: use LTP as sell price, today as sell date for XIRR
            const ltpOrBuy = Number(stock.ltp ?? stock.buy_price ?? 0);
            cashflows.push({
              amount: qty * ltpOrBuy,
              date: new Date().toISOString(),
            });
            // For invested/return/holding: only include non-exited stocks
            basketInvested += qty * buyPrice;
            basketNet += qty * ltpOrBuy;
          }
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
    <>
      <div className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-6 lg:px-8">
        {/* Portfolio Summary and Baskets Section */}
        <section className="space-y-4">
          <div className="relative">
            <div className="relative overflow-hidden space-y-8 rounded-[2rem] bg-white p-7 md:p-10 shadow-[0_8px_40px_rgb(0,0,0,0.04)] ring-1 ring-slate-200/80">
              <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary-50/50 blur-3xl"></div>
              
              {/* Header: Overall Holding Label and Value */}
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4 text-xl font-bold tracking-tight text-slate-900 font-heading">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 ring-1 ring-primary-100/50 shadow-sm">
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 7h18M3 12h18M3 17h18"
                      />
                    </svg>
                  </div>
                  <span className="leading-snug text-slate-800">Portfolio Value</span>
                </div>
                <div className="text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
                  <span className="text-slate-400 mr-1 font-sans">₹</span>
                  {totalNetValue.toLocaleString()}
                </div>
              </div>

              {/* Invested, XIRR, Total Return (vertical grid layout) */}
              <div className="grid w-full grid-cols-2 lg:grid-cols-4 gap-6 border-t border-slate-100 pt-8 text-sm relative z-10">
                {/* Invested */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Invested
                  </div>
                  <div className="text-xl font-semibold text-slate-800 tabular-nums">
                    ₹{totalInvested.toLocaleString()}
                  </div>
                </div>

                {/* XIRR */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    XIRR
                  </div>
                  <div
                    className={`text-xl font-bold tabular-nums ${
                      xirr >= 0.01
                        ? "text-accent-600"
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
                <div className="space-y-1.5 lg:col-span-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Total Return
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div
                      className={`text-xl font-bold tabular-nums ${
                        totalReturn > 0
                          ? "text-accent-600"
                          : totalReturn < 0
                            ? "text-rose-500"
                            : "text-slate-600"
                      }`}
                    >
                      {totalReturn > 0 ? "+" : totalReturn < 0 ? "-" : ""}₹
                      {Math.abs(totalReturn).toLocaleString()}
                    </div>
                    <div
                      className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${
                        totalReturn > 0
                          ? "bg-accent-50 text-accent-700 ring-1 ring-accent-200/50"
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
        <section className="mt-12 mb-20 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-slate-900 font-heading">Your Baskets</h3>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200/70">{baskets.length} Total</span>
          </div>

          <div className="grid gap-5 sm:grid-cols-1 md:grid-cols-2">
            {baskets.length > 0 ? (
              [...baskets]
                .sort((a, b) => {
                  const aDate = a.created_at
                    ? new Date(toISTISOString(a.created_at)).getTime()
                    : 0;
                  const bDate = b.created_at
                    ? new Date(toISTISOString(b.created_at)).getTime()
                    : 0;
                  return bDate - aDate;
                })
                .map((basket) => {
                  let basketInvested = 0;
                  let basketSellValue = 0;
                  let earliestDate: string | undefined = undefined;

                  const allExited =
                    basket.stocks.length > 0 &&
                    basket.stocks.every((stock) => {
                      return (
                        stock.sell_price != null &&
                        !isNaN(Number(stock.sell_price)) &&
                        typeof stock.sell_date === "string" &&
                        stock.sell_date.trim() !== "" &&
                        !isNaN(Date.parse(stock.sell_date))
                      );
                    });

                  basket.stocks.forEach((stock) => {
                    const qty = stock.quantity ?? 0;
                    const buyPrice = stock.buy_price ?? 0;
                    basketInvested += qty * buyPrice;
                    const hasSell =
                      stock.sell_price != null &&
                      !isNaN(Number(stock.sell_price));
                    const sellOrLtp = hasSell
                      ? Number(stock.sell_price)
                      : Number(stock.ltp ?? stock.buy_price ?? 0);
                    basketSellValue += qty * sellOrLtp;

                    if (qty && buyPrice && basket.created_at) {
                      if (
                        !earliestDate ||
                        new Date(toISTISOString(basket.created_at)) <
                          new Date(toISTISOString(earliestDate))
                      ) {
                        earliestDate = basket.created_at;
                      }
                    }
                  });

                  let daysSince = 0;
                  if (earliestDate) {
                    const createdAtIST = new Date(toISTISOString(earliestDate));
                    const todayIST = new Date(
                      new Date().toLocaleDateString("en-US", {
                        timeZone: "Asia/Kolkata",
                      }),
                    );
                    const diffMs =
                      todayIST.getTime() -
                      new Date(createdAtIST).setHours(0, 0, 0, 0);
                    const diffDays = diffMs / (1000 * 60 * 60 * 24);
                    daysSince = Math.floor(diffDays);
                  }

                  const sellDates = basket.stocks
                    .map((stock) =>
                      stock.sell_date && !isNaN(Date.parse(stock.sell_date))
                        ? new Date(toISTISOString(stock.sell_date)).getTime()
                        : undefined,
                    )
                    .filter((d): d is number => d !== undefined);
                  const finalDate = sellDates.length
                    ? Math.max(...sellDates)
                    : new Date(toISTISOString(new Date())).getTime();
                  const startDate = earliestDate
                    ? new Date(toISTISOString(earliestDate)).getTime()
                    : finalDate;
                  const months =
                    (finalDate - startDate) / (1000 * 60 * 60 * 24 * 30.4375);
                  const monthlyReturn =
                    months > 0
                      ? (basketSellValue - basketInvested) / months
                      : 0;

                  let monthlyLabel = "";
                  if (allExited) {
                    monthlyLabel = monthlyReturn >= 0 ? "Grown " : "Lost ";
                  } else {
                    monthlyLabel = monthlyReturn >= 0 ? "Growing " : "Losing ";
                  }

                  return (
                    <Link
                      key={basket.id}
                      to={`/basket?id=${basket.id}`}
                      state={{ basketId: basket.id }}
                      className="group block h-full"
                    >
                      <div className="flex h-full flex-col justify-between rounded-[1.5rem] bg-white p-6 shadow-[0_2px_10px_rgb(0,0,0,0.02)] ring-1 ring-slate-200/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:ring-primary-200">
                        <div className="mb-4">
                          <h4 className="mb-2 truncate text-xl font-bold text-slate-900 font-heading group-hover:text-primary-600 transition-colors">
                            {basket.name}
                          </h4>
                          <div className="flex flex-wrap gap-2 text-xs text-slate-500 font-medium">
                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1 ring-1 ring-slate-200/50">
                              <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {earliestDate ? (daysSince === 0 ? "Today" : `${daysSince}d ago`) : "N/A"}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1 ring-1 ring-slate-200/50">
                              <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                              </svg>
                              {monthlyLabel} {Math.abs(basketInvested ? (monthlyReturn / basketInvested) * 100 : 0).toFixed(1)}%/mo
                            </span>
                          </div>
                        </div>
                        
                        <div className="mt-auto flex items-end justify-between border-t border-slate-50 pt-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Value</span>
                            <span className="text-xl font-bold text-slate-800 tabular-nums">
                              ₹{Math.round(basketSellValue).toLocaleString()}
                            </span>
                          </div>
                          {(() => {
                            const percent = basketInvested ? ((basketSellValue - basketInvested) / basketInvested) * 100 : 0;
                            const isPositive = percent >= 0.01;
                            const isNegative = percent <= -0.01;
                            const bgColor = isPositive ? "bg-accent-50 text-accent-700 ring-accent-200" : isNegative ? "bg-rose-50 text-rose-700 ring-rose-200" : "bg-slate-50 text-slate-600 ring-slate-200";
                            const sign = isPositive ? "+" : isNegative ? "-" : "";
                            
                            return (
                              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-sm font-bold ring-1 ${bgColor}`}>
                                {sign}{Math.abs(percent).toFixed(2)}%
                              </span>
                            );
                          })()}
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
                  <div className="mb-3 text-2xl font-bold tracking-tight text-slate-900 font-heading">
                    No baskets yet
                  </div>
                  <div className="mb-8 text-sm font-medium text-slate-500 leading-relaxed">
                    Start by creating your first investment basket to track your portfolio performance smoothly.
                  </div>
                  <Link
                    to="/search"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-primary-600/20 transition-all hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-primary-600/40 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
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

      <Link
        to="/search"
        className="fixed right-6 bottom-8 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-primary-600 text-white shadow-xl shadow-primary-600/30 transition-all hover:scale-105 hover:bg-primary-700 hover:shadow-primary-600/40"
        title="Create New Basket"
      >
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className="h-8 w-8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </Link>
    </>
  );
});
export default Dashboard;
