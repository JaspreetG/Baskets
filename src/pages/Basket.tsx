import { Link } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { globalStore } from "@/store";
import { motion } from "framer-motion";

import { useState } from "react";

export default function Basket() {
  const [pendingExit, setPendingExit] = useState(false);
  const [localExited, setLocalExited] = useState(false);
  const hasMounted = useRef(false);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const basketId = searchParams.get("id") ?? location.state?.basketId;
  const baskets = globalStore((s) => s.baskets);
  const basket = baskets.find((b) => b.id === basketId);

  useEffect(() => {
    hasMounted.current = true;
  }, []);

  if (!basketId || !basket) {
    return (
      <div className="mx-auto w-full max-w-2xl px-6 py-8 text-gray-800">
        <div className="text-center text-gray-500">Basket not found.</div>
      </div>
    );
  }

  // Calculate values
  // For each stock, use sell price if available, else LTP, else buy price
  // For each stock, use sell price if available, else LTP, else buy price
  let totalBuyValue = 0;
  let totalSellValue = 0;
  basket.stocks.forEach((s) => {
    const qty = s.quantity ?? 0;
    const buyPrice = s.buy_price ?? 0;
    totalBuyValue += qty * buyPrice;
    const hasSell = s.sell_price != null && !isNaN(Number(s.sell_price));
    const sellOrLtp = hasSell
      ? Number(s.sell_price)
      : Number(s.ltp ?? s.buy_price ?? 0);
    totalSellValue += qty * sellOrLtp;
  });
  const invested = totalBuyValue;
  const currentValue = totalSellValue;
  const totalReturn = currentValue - invested;
  const returnPercent = invested ? (totalReturn / invested) * 100 : 0;
  // Disable exit if all stocks have a non-null sell_date (all exited)
  const allExited =
    localExited ||
    (basket.stocks.length > 0 &&
      basket.stocks.every(
        (s) =>
          typeof s.sell_date === "string" &&
          s.sell_date.trim() !== "" &&
          !isNaN(Date.parse(s.sell_date)),
      ));

  async function handleExitBasket() {
    if (pendingExit || allExited) return;
    setPendingExit(true);
    try {
      // Fetch LTP for each stock in the basket using the same API as dashboard
      const ltpData: Record<string, number> = {};
      await Promise.all(
        basket!.stocks.map(async (stock) => {
          try {
            const res = await fetch(
              `https://zmvzrrggaergcqytqmil.supabase.co/functions/v1/ltp-api?symbol=${stock.symbol}`,
              {
                headers: {
                  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                },
              },
            );
            const data = await res.json();
            ltpData[stock.symbol] = data.ltp;
          } catch {
            // ignore
          }
        }),
      );

      // Update LTPs in global store for this basket
      globalStore.getState().setBaskets(
        baskets.map((b) =>
          b.id === basket!.id
            ? {
                ...b,
                stocks: b.stocks.map((s) => ({
                  ...s,
                  ltp: ltpData[s.symbol] ?? s.ltp ?? s.buy_price ?? 0,
                })),
              }
            : b,
        ),
      );

      // Prepare array of stocks with their latest LTP as sell_price
      const stocksToExit = basket!.stocks.map((s) => ({
        symbol: s.symbol,
        sell_price: ltpData[s.symbol] ?? s.ltp ?? s.buy_price ?? 0,
      }));

      // Call exit_basket with up-to-date prices
      const { error } = await supabase.rpc("exit_basket", {
        exit_basket: {
          basket_id: basket!.id,
          stocks: stocksToExit,
          sell_date: new Date().toISOString().split("T")[0],
        },
      });

      if (error) {
        toast.error("Exit failed. Try again.");
        setPendingExit(false);
      } else {
        toast.success("Basket exited.");
        setLocalExited(true);
        setPendingExit(false);
      }
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to fetch latest prices.";
      toast.error(errorMsg);
      setPendingExit(false);
    }
  }

  return (
    <motion.div
      className="mx-auto w-full max-w-2xl space-y-8 px-6 py-8 text-gray-800"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeInOut" }}
    >
      {/* Back Button */}
      <div className="mb-2">
        <Link
          to="/"
          className="flex items-center gap-2 text-base font-medium text-gray-600 hover:text-gray-900"
        >
          <FaArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Link>
      </div>

      {/* Performance Summary */}
      <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-white to-gray-50 p-6 shadow-[0_12px_32px_rgba(0,0,0,0.06)] backdrop-blur">
        <h2 className="mb-1 text-lg font-semibold text-gray-800">
          {basket.name}
        </h2>
        <p className="mb-4 text-xs font-medium text-gray-500">
          Invested: {new Date(basket.created_at).toLocaleDateString()}
        </p>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-500">Current Value</p>
            <p className="text-3xl font-light text-gray-900">
              ₹{currentValue.toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Total Return</p>
            <p
              className={
                "text-sm font-medium " +
                (totalReturn === 0
                  ? "text-gray-500"
                  : totalReturn > 0
                    ? "text-green-600"
                    : "text-red-500")
              }
            >
              {totalReturn === 0 ? "" : totalReturn > 0 ? "+" : "-"}₹
              {Math.abs(totalReturn).toLocaleString()} ({" "}
              <span
                className={
                  returnPercent === 0
                    ? "text-gray-500"
                    : returnPercent > 0
                      ? "text-green-600"
                      : "text-red-500"
                }
              >
                {returnPercent === 0 ? "" : returnPercent > 0 ? "+" : "-"}
                {Math.abs(returnPercent).toFixed(2)}%
              </span>{" "}
              )
            </p>
          </div>
        </div>
      </div>

      {/* Stock Breakdown */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.04)]">
        <div className="border-b border-gray-100 px-5 py-4 text-base font-semibold text-gray-700">
          Stock Composition
        </div>
        <ul className="divide-y divide-gray-100">
          {basket.stocks.map((stock) => {
            const stockInvested =
              (stock.quantity ?? 0) * (stock.buy_price ?? 0);
            // Use sell_price if available (and sell_date is valid), else ltp, else buy_price
            const hasSell =
              stock.sell_price != null &&
              !isNaN(Number(stock.sell_price)) &&
              typeof stock.sell_date === "string" &&
              stock.sell_date.trim() !== "" &&
              !isNaN(Date.parse(stock.sell_date));
            const stockCurrent =
              (stock.quantity ?? 0) *
              (hasSell
                ? Number(stock.sell_price)
                : Number(stock.ltp ?? stock.buy_price ?? 0));
            const stockReturn = stockCurrent - stockInvested;
            const stockReturnPercent = stockInvested
              ? (stockReturn / stockInvested) * 100
              : 0;
            // Color and sign logic: green for +, red for -, gray for 0; no sign for 0
            let valueClass = "text-right font-light text-gray-500";
            if (stockReturnPercent > 0)
              valueClass = "text-right font-light text-green-600";
            else if (stockReturnPercent < 0)
              valueClass = "text-right font-light text-red-500";
            return (
              <li
                key={stock.symbol}
                className="flex items-center justify-between px-5 py-4 text-sm"
              >
                <span className="font-medium text-gray-800">
                  {stock.name && stock.name !== stock.symbol
                    ? `${stock.name} (${stock.symbol})`
                    : stock.symbol}
                </span>
                <span className={valueClass}>
                  ₹{stockCurrent.toLocaleString()} <br />
                  <span className="text-xs font-normal">
                    <span
                      className={
                        stockReturnPercent === 0
                          ? "text-gray-500"
                          : stockReturnPercent > 0
                            ? "text-green-600"
                            : "text-red-500"
                      }
                    >
                      {stockReturnPercent === 0
                        ? ""
                        : stockReturnPercent > 0
                          ? "+"
                          : "-"}
                      {Math.abs(stockReturnPercent).toFixed(2)}%
                    </span>
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Exit Basket button */}
      <div className="pt-4">
        <button
          onClick={handleExitBasket}
          disabled={allExited || pendingExit}
          className="w-full rounded-lg bg-red-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
        >
          {(() => {
            if (allExited) return "Exit taken";
            if (pendingExit) return "Exiting...";
            return "Exit Basket";
          })()}
        </button>
      </div>
    </motion.div>
  );
}
