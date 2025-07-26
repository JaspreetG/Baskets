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
            <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-white to-gray-50 p-5 shadow-[0_3px_30px_rgba(0,0,0,0.08)]">
              <div className="mb-6 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-800">
                  Holding
                </span>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                  XIRR
                  {(() => {
                    const displayXirr = fixNegativeZero(xirr);
                    if (displayXirr === 0) return " 0.00%";
                    if (displayXirr > 0) return ` +${displayXirr.toFixed(2)}%`;
                    return ` -${Math.abs(displayXirr).toFixed(2)}%`;
                  })()}
                </span>
              </div>
              <p className="mb-6 text-3xl font-light text-gray-900">
                ₹{totalNetValue.toLocaleString()}
              </p>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-gray-500">Total return</p>
                {(() => {
                  let returnClass = "text-sm font-medium text-gray-400";
                  if (totalReturn > 0)
                    returnClass = "text-sm font-medium text-green-600";
                  else if (totalReturn < 0)
                    returnClass = "text-sm font-medium text-red-500";

                  let sign = "";
                  if (totalReturn > 0) sign = "+";
                  else if (totalReturn < 0) sign = "-";

                  const percent = totalInvested
                    ? (totalReturn / totalInvested) * 100
                    : 0;

                  let percentClass = "text-gray-400";
                  if (percent > 0) percentClass = "text-green-600";
                  else if (percent < 0) percentClass = "text-red-500";

                  let percentSign = "";
                  if (totalInvested !== 0 && percent !== 0) {
                    percentSign = percent >= 0 ? "+" : "-";
                  }

                  return (
                    <p className={returnClass}>
                      {sign}₹{Math.abs(totalReturn).toLocaleString()} (
                      <span className={percentClass}>
                        {percentSign}
                        {totalInvested ? Math.abs(percent).toFixed(2) : "0.00"}%
                      </span>
                      )
                    </p>
                  );
                })()}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-gray-500">Invested</p>
                <p className="text-sm font-semibold text-gray-800">
                  ₹{totalInvested.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Baskets Section */}
        <section className="mt-8 space-y-4">
          <div className="my-8 flex items-center gap-4">
            <hr className="flex-grow border-t border-gray-200" />
            <span className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
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
                  });

                  const percent = basketInvested
                    ? ((basketSellValue - basketInvested) / basketInvested) *
                      100
                    : 0;

                  let percentClass = "text-gray-400";
                  if (percent > 0) percentClass = "text-green-600";
                  else if (percent < 0) percentClass = "text-red-500";

                  let percentSign = "";
                  const percentValue = basketInvested ? Math.abs(percent) : 0;
                  const percentDisplay =
                    percentValue < 0.005 ? "0.00" : percentValue.toFixed(2);

                  if (basketInvested !== 0 && percentDisplay !== "0.00") {
                    percentSign = percent > 0 ? "+" : "-";
                  }

                  return (
                    <Link
                      key={basket.id}
                      to={`/basket?id=${basket.id}`}
                      state={{ basketId: basket.id }}
                    >
                      <div className="mb-1.5 flex items-center justify-between rounded-xl border border-gray-100 bg-gradient-to-br from-white to-gray-50 px-5 py-4 shadow-[0_4px_16px_rgba(0,0,0,0.05)] backdrop-blur-sm">
                        <div>
                          <h4 className="text-base font-semibold text-gray-900">
                            {basket.name}
                          </h4>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-semibold text-gray-900">
                            ₹{Math.round(basketSellValue).toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500">
                            <span className={percentClass}>
                              {percentSign}
                              {percentDisplay}%
                            </span>
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white px-10 py-14 text-center shadow-lg">
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
