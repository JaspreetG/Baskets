import { Link } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { globalStore } from "@/store";
import { motion } from "framer-motion";

export default function Basket() {
  const hasMounted = useRef(false);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const basketId = searchParams.get("id") ?? location.state?.basketId;
  const baskets = globalStore((s) => s.baskets);
  const basket = baskets.find((b) => b.id === basketId);

  useEffect(() => {
    hasMounted.current = true;
  }, []);

  // Always call hooks at the top level
  const [exited, setExited] = useState(false);

  if (!basketId || !basket) {
    return (
      <div className="mx-auto w-full max-w-2xl px-6 py-8 text-gray-800">
        <div className="text-center text-gray-500">Basket not found.</div>
      </div>
    );
  }

  // Calculate values
  const invested = basket.stocks.reduce(
    (acc, s) => acc + (s.quantity ?? 0) * (s.buy_price ?? 0),
    0,
  );
  const currentValue = basket.stocks.reduce(
    (acc, s) => acc + (s.quantity ?? 0) * (s.ltp ?? s.buy_price ?? 0),
    0,
  );
  const totalReturn = currentValue - invested;
  const returnPercent = invested ? (totalReturn / invested) * 100 : 0;
  const hasUnexitedStock = basket.stocks.some((s) => s.sell_price === null);

  async function handleExitBasket() {
    const { error } = await supabase.rpc("exit_basket", {
      exit_basket: {
        basket_id: basket?.id,
        sell_price: currentValue,
        sell_date: new Date().toISOString().split("T")[0],
      },
    });

    if (error) {
      toast.error("Exit failed. Try again.");
    } else {
      toast.success("Basket exited.");
      setExited(true);
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
      <div className="mb-2 flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2 text-base font-medium text-gray-600 hover:text-gray-900"
        >
          <FaArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Link>
        <Link
          to="/"
          className="inline-block rounded-lg bg-blue-600 px-5 py-2 text-base font-semibold text-white shadow hover:bg-blue-700 focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:outline-none"
        >
          Done
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
            <p className="text-2xl font-bold text-gray-900">
              ₹{currentValue.toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Total Return</p>
            <p
              className={
                "text-sm font-semibold " +
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
            const stockCurrent =
              (stock.quantity ?? 0) * (stock.ltp ?? stock.buy_price ?? 0);
            const stockReturn = stockCurrent - stockInvested;
            const stockReturnPercent = stockInvested
              ? (stockReturn / stockInvested) * 100
              : 0;
            // Color and sign logic: green for +, red for -, gray for 0; no sign for 0
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
                <span
                  className={
                    stockReturnPercent === 0
                      ? "text-right font-semibold text-gray-500"
                      : stockReturnPercent > 0
                        ? "text-right font-semibold text-green-600"
                        : "text-right font-semibold text-red-500"
                  }
                >
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
          disabled={!hasUnexitedStock || exited}
          className="w-full rounded-lg bg-red-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
        >
          Exit Basket
        </button>
      </div>
    </motion.div>
  );
}
