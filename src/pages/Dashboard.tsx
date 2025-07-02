import { Link } from "react-router-dom";
import { useCallback, useEffect, useMemo, memo } from "react";
import { useState } from "react";
import { motion } from "framer-motion";
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
  const [loading, setLoading] = useState(() => true); // ensures loader is visible on first render

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
    setLoading(true);
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
    setLoading(false);
  }, [setBaskets, fetchLTPForStock]);

  useEffect(() => {
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

  // (removed duplicate isExited declaration)

  // (No duplicate XIRR/cashflow logic needed)

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div
          className="h-14 w-14 animate-spin rounded-full border-4 border-neutral-900 border-t-transparent shadow-lg"
          style={{
            background: "none",
            boxShadow:
              "0 2px 12px 0 rgba(0,0,0,0.10), 0 1.5px 4px 0 rgba(0,0,0,0.08)",
          }}
        />
      </div>
    );
  }

  return (
    <>
      <motion.div
        className="mx-auto max-w-4xl space-y-8 px-4 py-6 sm:px-6 lg:px-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeInOut" }}
      >
        {/* Portfolio Summary */}
        <section className="space-y-4">
          <h1 className="text-xl font-semibold text-gray-900">
            Portfolio Overview
          </h1>
          <div className="relative">
            <div className="before:animate-spin-slower before:absolute before:inset-0 before:-z-10 before:rounded-2xl before:border-2 before:border-transparent before:bg-[conic-gradient(at_top_left,_rgba(34,197,94,0.2),rgba(110,231,183,0.2),rgba(34,197,94,0.2))] before:blur">
              <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-white to-gray-50 p-5 shadow-[0_10px_40px_rgba(0,0,0,0.08)] backdrop-blur-md transition hover:shadow-[0_6px_24px_rgba(0,0,0,0.05)]">
                <div className="mb-6 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-800">
                    Holding
                  </span>
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-600">
                    XIRR
                    {(() => {
                      const displayXirr = fixNegativeZero(xirr);
                      if (displayXirr === 0) return " 0.00%";
                      if (displayXirr > 0)
                        return ` +${displayXirr.toFixed(2)}%`;
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
                    // Extracted ternary logic for className and sign
                    let returnClass = "text-sm font-medium text-gray-400";
                    if (totalReturn > 0)
                      returnClass = "text-sm font-medium text-green-600";
                    else if (totalReturn < 0)
                      returnClass = "text-sm font-medium text-red-500";
                    let sign = "";
                    if (totalReturn > 0) sign = "+";
                    else if (totalReturn < 0) sign = "-";
                    // For percent
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
                          {totalInvested
                            ? Math.abs(percent).toFixed(2)
                            : "0.00"}
                          %
                        </span>
                        )
                      </p>
                    );
                  })()}
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-gray-500">Invested</p>
                  <p className="text-sm font-medium text-gray-900">
                    ₹{totalInvested.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Baskets Section */}
        <section className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">
            <span className="px-3 py-3 text-gray-500">baskets</span>
          </h2>

          <div className="space-y-4">
            {baskets.length > 0 ? (
              // Sort baskets by created_at descending (most recent first)
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
                  // Per-basket: for each stock, use sell price if available, else LTP, else buy price
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
                  // Show percent with 2 decimals, no sign for near zero
                  let percentSign = "";
                  const percentValue = basketInvested ? Math.abs(percent) : 0;
                  const percentDisplay =
                    percentValue < 0.005 ? "0.00" : percentValue.toFixed(2);
                  // Only assign sign if percentDisplay is not 0.00
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
                          <p className="text-xl font-light text-green-600">
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
              <div className="flex flex-col items-center justify-center py-8">
                <div className="w-full max-w-md rounded-2xl border-2 border-dotted border-gray-300 bg-white/70 px-8 py-16 text-center shadow-sm">
                  <div className="mb-4 text-4xl" style={{ color: "#FFD700" }}>
                    💵
                  </div>
                  <div className="mb-2 text-lg font-semibold text-gray-700">
                    No baskets yet
                  </div>
                  <div className="mb-4 text-gray-500">
                    Start by creating your first investment basket to track your
                    portfolio performance.
                  </div>
                  <Link
                    to="/search"
                    className="inline-block rounded-lg border border-green-600 bg-green-50 px-6 py-2 text-green-700 transition hover:bg-green-100 hover:text-green-800"
                  >
                    + Create Basket
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>
      </motion.div>
      <Link
        to="/search"
        className="fixed right-6 bottom-8 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-green-600 text-white shadow-lg transition hover:bg-green-700"
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
