import { Link } from "react-router-dom";
import { useCallback, useEffect, useMemo, memo } from "react";

import { supabase } from "@/lib/supabase";
import { globalStore } from "@/store";

// Utility for XIRR calculation
// cashflows: array of { amount: number, date: string }, negative for investment, positive for return
// If no sell_date, use current date as end date
function calculateXIRR(cashflows: { amount: number; date: string }[]): number {
  if (cashflows.length < 2) return 0;
  // Ensure at least one positive and one negative cashflow
  const hasPositive = cashflows.some((c) => c.amount > 0);
  const hasNegative = cashflows.some((c) => c.amount < 0);
  if (!hasPositive || !hasNegative) return 0;

  // Convert all dates to ms
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
    if (Math.abs(f) < tol) return fixNegativeZero(rate * 100);
    if (df === 0) break;
    rate = rate - f / df;
  }
  return fixNegativeZero(rate * 100);
}

// Utility to fix -0.00 to 0.00
function fixNegativeZero(val: number): number {
  // Treat -0 and very small values as 0 for display
  if (Object.is(val, -0) || Math.abs(val) < 0.005) return 0;
  return val;
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
                : new Date().toISOString().split("T")[0];
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
              date: new Date().toISOString().split("T")[0],
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
    if (cashflows.length > 1) {
      xirr = calculateXIRR(cashflows);
      if (!isFinite(xirr)) xirr = 0;
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
      <div className="mx-auto max-w-4xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
        {/* Portfolio Summary and Baskets Section */}
        <section className="space-y-4">
          <div className="relative">
            <div className="space-y-6 rounded-2xl bg-white px-6 py-6 shadow-lg ring-1 ring-gray-200">
              {/* Header: Overall Holding Label and Value */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xl font-semibold tracking-tight text-gray-900">
                  <svg
                    className="h-6 w-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    viewBox="0 0 24 24"
                  >
                    {/* Briefcase icon */}
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 7h18M3 12h18M3 17h18"
                    />
                  </svg>
                  <span className="leading-snug">Holding</span>
                </div>
                <div className="text-2xl font-medium tracking-tight text-gray-800 tabular-nums">
                  ₹{totalNetValue.toLocaleString()}
                </div>
              </div>

              {/* Invested, XIRR, Total Return (vertical grid layout) */}
              <div className="grid w-full grid-cols-2 gap-x-4 gap-y-3 border-t border-gray-100 pt-4 text-sm sm:grid-cols-2">
                {/* Invested */}
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <svg
                    className="h-4 w-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 7V5a2 2 0 012-2h8a2 2 0 012 2v2M4 7h16v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7z"
                    />
                  </svg>
                  Invested
                </div>
                <div className="text-right text-sm font-medium text-gray-800">
                  ₹{totalInvested.toLocaleString()}
                </div>

                {/* XIRR */}
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <svg
                    className="h-4 w-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 4v5h.582M20 20v-5h-.581M4.582 9A8 8 0 0112 4a8 8 0 017.418 5M19.418 15A8 8 0 0112 20a8 8 0 01-7.418-5"
                    />
                  </svg>
                  XIRR
                </div>
                <div className="text-right text-sm font-medium text-gray-800">
                  {(() => {
                    const displayXirr = fixNegativeZero(xirr);
                    if (displayXirr === 0) return "0.00%";
                    if (displayXirr > 0) return `+${displayXirr.toFixed(2)}%`;
                    return `-${Math.abs(displayXirr).toFixed(2)}%`;
                  })()}
                </div>

                {/* Total Return */}
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <svg
                    className="h-4 w-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    viewBox="0 0 24 24"
                    style={{ marginTop: "1px" }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 17l6-6 4 4 7-7M14 7h7v7"
                    />
                  </svg>
                  <span>Total Return</span>
                </div>
                <div
                  className={`text-right text-sm font-medium ${
                    totalReturn > 0
                      ? "text-green-600"
                      : totalReturn < 0
                        ? "text-red-500"
                        : "text-gray-500"
                  }`}
                >
                  {totalReturn > 0 ? "+" : totalReturn < 0 ? "-" : ""}₹
                  {Math.abs(totalReturn).toLocaleString()} (
                  {totalInvested
                    ? `${((totalReturn / totalInvested) * 100).toFixed(2)}%`
                    : "0.00%"}
                  )
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Baskets Section */}
        <section className="mt-8 space-y-4">
          <div className="my-8 flex items-center gap-4">
            <hr className="flex-grow border-t border-gray-200" />
            <span className="text-xs font-medium tracking-wide text-gray-500 uppercase">
              BASKETS
            </span>
            <hr className="flex-grow border-t border-gray-200" />
          </div>

          <div className="space-y-4">
            {baskets.length > 0 ? (
              [...baskets]
                .sort((a, b) => {
                  const aDate = a.created_at
                    ? new Date(a.created_at).getTime()
                    : 0;
                  const bDate = b.created_at
                    ? new Date(b.created_at).getTime()
                    : 0;
                  return bDate - aDate;
                })
                .map((basket) => {
                  let basketInvested = 0;
                  let basketSellValue = 0;
                  let earliestDate: string | undefined = undefined;

                  // Allow for null sell_price in type check
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
                        new Date(basket.created_at) < new Date(earliestDate)
                      ) {
                        earliestDate = basket.created_at;
                      }
                    }
                  });

                  // Days since investment (calendar days, ignore time)
                  let daysSince = 0;
                  if (earliestDate) {
                    const today = new Date();
                    const createdAt = new Date(
                      new Date(earliestDate).toDateString(),
                    );
                    const diffInMs = today.getTime() - createdAt.getTime();
                    daysSince = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
                  }

                  // Monthly return
                  const months = daysSince / 30;
                  const monthlyReturn =
                    months > 0
                      ? (basketSellValue - basketInvested) / months
                      : 0;

                  // Determine label for monthly return
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
                      className="group block"
                    >
                      <div className="mb-3 flex items-center justify-between rounded-xl bg-white px-5 py-4 font-light shadow-sm ring-1 ring-gray-100 transition hover:shadow-sm">
                        <div className="flex w-2/3 min-w-0 flex-col gap-1">
                          <h4 className="truncate text-base font-medium text-gray-900">
                            {basket.name}
                          </h4>
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4 text-gray-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={1.5}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 6v6l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            {daysSince === 0
                              ? "Invested today"
                              : `Invested ${daysSince} days ago`}
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4 text-gray-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={1.5}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M13 16h-1v-4h-1m1-4h.01M12 20.5C6.753 20.5 2.5 16.247 2.5 11S6.753 1.5 12 1.5 21.5 5.753 21.5 11 17.247 20.5 12 20.5Z"
                              />
                            </svg>
                            {monthlyLabel}
                            {Math.abs(
                              basketInvested
                                ? (monthlyReturn / basketInvested) * 100
                                : 0,
                            ).toFixed(2)}
                            % monthly
                          </span>
                        </div>
                        <div className="flex flex-col items-end space-y-1 text-right">
                          <span className="text-xs text-gray-400">
                            Current Value
                          </span>
                          <span className="text-xl font-medium text-gray-800 tabular-nums">
                            ₹{Math.round(basketSellValue).toLocaleString()}
                          </span>
                          <span className="text-xs text-gray-500">
                            {basketInvested
                              ? (
                                  ((basketSellValue - basketInvested) /
                                    basketInvested) *
                                  100
                                ).toFixed(2)
                              : "0.00"}
                            %
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-full max-w-md rounded-xl border border-gray-100 bg-white px-10 py-12 text-center shadow-sm">
                  <div className="mb-4 flex justify-center">
                    <svg
                      width="44"
                      height="44"
                      viewBox="0 0 44 44"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="drop-shadow-sm"
                    >
                      <rect width="44" height="44" rx="12" fill="#F1F5F9" />
                      <path
                        d="M14 22h16M22 14v16"
                        stroke="#2563EB"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <div className="mb-2 text-lg font-semibold tracking-tight text-gray-800">
                    No baskets yet
                  </div>
                  <div className="mb-6 text-sm text-gray-500">
                    Start by creating your first investment basket to track your
                    portfolio.
                  </div>
                  <Link
                    to="/search"
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 font-semibold text-white shadow-md transition hover:bg-blue-700 focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:outline-none"
                  >
                    <svg
                      width="18"
                      height="18"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="-ml-1"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    Create Basket
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      <Link
        to="/search"
        className="fixed right-6 bottom-8 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition hover:bg-blue-700"
        style={{ lineHeight: 0 }}
      >
        <span
          className="flex h-full w-full items-center justify-center text-3xl leading-none"
          style={{ lineHeight: 1.15, marginTop: "-5px" }}
        >
          +
        </span>
      </Link>
    </>
  );
});
export default Dashboard;
