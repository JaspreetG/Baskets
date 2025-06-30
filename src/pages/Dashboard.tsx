import { Link, useNavigationType } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
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
    if (Math.abs(f) < tol) return rate * 100;
    if (df === 0) break;
    rate = rate - f / df;
  }
  return rate * 100;
}

export default function Dashboard() {
  const isBack = useNavigationType() === "POP";
  const hasMounted = useRef(false);

  const setBaskets = globalStore((s) => s.setBaskets);
  const updateBasketLTP = globalStore((s) => s.updateBasketLTP);
  const baskets = globalStore((s) => s.baskets);
  // removed unused loading

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
  useEffect(() => {
    let isMounted = true;
    hasMounted.current = true;

    async function fetchLTPForStock(basketId: string, stock: Stock) {
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
        if (isMounted) updateBasketLTP(basketId, stock.symbol, ltpData.ltp);
      } catch {
        // ignore
      }
    }

    async function fetchAndSetBaskets() {
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
    }
    fetchAndSetBaskets();
    return () => {
      isMounted = false;
    };
  }, [setBaskets, updateBasketLTP]);

  // Calculate portfolio summary
  let totalNetValue = 0;
  let totalInvested = 0;
  let totalReturn = 0;
  let xirr = 0;
  // Aggregate all cashflows for XIRR
  const allCashflows: { amount: number; date: string }[] = [];
  (baskets as Basket[]).forEach((basket) => {
    let basketNet = 0;
    let basketInvested = 0;
    const basketCashflows: { amount: number; date: string }[] = [];
    basket.stocks.forEach((stock) => {
      const ltp = stock.ltp ?? stock.buy_price;
      basketNet += (stock.quantity ?? 0) * (ltp ?? 0);
      basketInvested += (stock.quantity ?? 0) * (stock.buy_price ?? 0);
      // Buy cashflow
      if (stock.quantity && stock.buy_price && basket.created_at) {
        basketCashflows.push({
          amount: -1 * stock.quantity * stock.buy_price,
          date: basket.created_at,
        });
      }
      // Sell cashflow if sold, else use current LTP and today
      if (
        stock.quantity &&
        stock.sell_price &&
        stock.sell_date &&
        !isNaN(Number(stock.sell_price)) &&
        !isNaN(Date.parse(stock.sell_date))
      ) {
        basketCashflows.push({
          amount: stock.quantity * stock.sell_price,
          date: stock.sell_date,
        });
      } else if (stock.quantity && ltp) {
        basketCashflows.push({
          amount: stock.quantity * ltp,
          date: new Date().toISOString().split("T")[0],
        });
      }
    });
    totalNetValue += basketNet;
    totalInvested += basketInvested;
    totalReturn += basketNet - basketInvested;
    allCashflows.push(...basketCashflows);
  });
  // No need for extra positive cashflow, handled above per stock
  if (allCashflows.length > 1) {
    xirr = calculateXIRR(allCashflows);
    if (!isFinite(xirr)) xirr = 0;
  }

  return (
    <motion.div
      className="mx-auto max-w-4xl space-y-8 px-4 py-6 sm:px-6 lg:px-8"
      initial={isBack || !hasMounted.current ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={isBack || !hasMounted.current ? {} : { opacity: 0, y: 20 }}
      transition={{ duration: 0.35, ease: "easeInOut" }}
    >
      {/* Portfolio Summary */}
      <section className="space-y-4">
        <h1 className="text-xl font-bold text-gray-900">Portfolio Overview</h1>
        <div className="relative">
          <div className="before:animate-spin-slower before:absolute before:inset-0 before:-z-10 before:rounded-2xl before:border-2 before:border-transparent before:bg-[conic-gradient(at_top_left,_rgba(34,197,94,0.2),rgba(110,231,183,0.2),rgba(34,197,94,0.2))] before:blur">
            <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-white to-gray-50 p-5 shadow-[0_10px_40px_rgba(0,0,0,0.08)] backdrop-blur-md transition hover:shadow-[0_6px_24px_rgba(0,0,0,0.05)]">
              <div className="mb-6 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-800">
                  Holding
                </span>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-600">
                  XIRR{xirr === 0 ? "" : xirr > 0 ? " +" : " -"}
                  {Math.abs(xirr).toFixed(2)}%
                </span>
              </div>
              <p className="mb-6 text-2xl font-bold text-gray-900">
                ₹{totalNetValue.toLocaleString()}
              </p>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-gray-500">Total return</p>
                <p
                  className={`text-sm font-semibold ${totalReturn > 0 ? "text-green-600" : totalReturn < 0 ? "text-red-500" : "text-gray-400"}`}
                >
                  {totalReturn === 0 ? "" : totalReturn > 0 ? "+" : "-"}₹
                  {Math.abs(totalReturn).toLocaleString()} (
                  <span
                    className={
                      totalInvested === 0
                        ? "text-gray-400"
                        : (totalReturn / totalInvested) * 100 > 0
                          ? "text-green-600"
                          : (totalReturn / totalInvested) * 100 < 0
                            ? "text-red-500"
                            : "text-gray-400"
                    }
                  >
                    {totalInvested === 0
                      ? ""
                      : (totalReturn / totalInvested) * 100 === 0
                        ? ""
                        : totalReturn >= 0
                          ? "+"
                          : "-"}
                    {totalInvested
                      ? Math.abs((totalReturn / totalInvested) * 100).toFixed(2)
                      : "0.00"}
                    %
                  </span>
                  )
                </p>
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
            baskets.map((basket) => (
              <Link
                key={basket.id}
                to={`/basket?id=${basket.id}`}
                state={{ basketId: basket.id }}
              >
                <div className="mb-1.5 flex items-center justify-between rounded-xl border border-gray-100 bg-gradient-to-br from-white to-gray-50 px-5 py-4 shadow-[0_4px_16px_rgba(0,0,0,0.05)] backdrop-blur-sm">
                  <div>
                    <h4 className="text-base font-medium text-gray-900">
                      {basket.name}
                    </h4>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-600">
                      ₹
                      {Math.round(
                        basket.stocks.reduce(
                          (acc, stock) =>
                            acc +
                            (stock.quantity ?? 0) *
                              (stock.ltp ?? stock.buy_price ?? 0),
                          0,
                        ),
                      ).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      <span
                        className={
                          ((basket.stocks.reduce(
                            (acc, stock) =>
                              acc +
                              (stock.quantity ?? 0) *
                                (stock.ltp ?? stock.buy_price ?? 0),
                            0,
                          ) -
                            basket.stocks.reduce(
                              (acc, stock) =>
                                acc +
                                (stock.quantity ?? 0) * (stock.buy_price ?? 0),
                              0,
                            )) /
                            (basket.stocks.reduce(
                              (acc, stock) =>
                                acc +
                                (stock.quantity ?? 0) * (stock.buy_price ?? 0),
                              0,
                            ) || 1)) *
                            100 >
                          0
                            ? "text-green-600"
                            : ((basket.stocks.reduce(
                                  (acc, stock) =>
                                    acc +
                                    (stock.quantity ?? 0) *
                                      (stock.ltp ?? stock.buy_price ?? 0),
                                  0,
                                ) -
                                  basket.stocks.reduce(
                                    (acc, stock) =>
                                      acc +
                                      (stock.quantity ?? 0) *
                                        (stock.buy_price ?? 0),
                                    0,
                                  )) /
                                  (basket.stocks.reduce(
                                    (acc, stock) =>
                                      acc +
                                      (stock.quantity ?? 0) *
                                        (stock.buy_price ?? 0),
                                    0,
                                  ) || 1)) *
                                  100 <
                                0
                              ? "text-red-500"
                              : "text-gray-400"
                        }
                      >
                        {(() => {
                          const invested = basket.stocks.reduce(
                            (acc, stock) =>
                              acc +
                              (stock.quantity ?? 0) * (stock.buy_price ?? 0),
                            0,
                          );
                          const net = basket.stocks.reduce(
                            (acc, stock) =>
                              acc +
                              (stock.quantity ?? 0) *
                                (stock.ltp ?? stock.buy_price ?? 0),
                            0,
                          );
                          if (invested === 0) return "";
                          const percent = ((net - invested) / invested) * 100;
                          if (percent === 0) return "";
                          return percent > 0 ? "+" : "-";
                        })()}
                        {(() => {
                          const invested = basket.stocks.reduce(
                            (acc, stock) =>
                              acc +
                              (stock.quantity ?? 0) * (stock.buy_price ?? 0),
                            0,
                          );
                          const net = basket.stocks.reduce(
                            (acc, stock) =>
                              acc +
                              (stock.quantity ?? 0) *
                                (stock.ltp ?? stock.buy_price ?? 0),
                            0,
                          );
                          return invested
                            ? Math.abs(
                                ((net - invested) / invested) * 100,
                              ).toFixed(1)
                            : "0.0";
                        })()}
                        %
                      </span>
                    </p>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-full max-w-md rounded-2xl border-2 border-dotted border-gray-300 bg-white/70 px-8 py-16 text-center shadow-sm">
                <div className="mb-4 text-4xl text-gray-300">🧺</div>
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
      <Link
        to="/search"
        className="fixed right-6 bottom-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-green-600 text-white shadow-lg transition hover:bg-green-700"
      >
        <span className="text-3xl leading-none">+</span>
      </Link>
    </motion.div>
  );
}
