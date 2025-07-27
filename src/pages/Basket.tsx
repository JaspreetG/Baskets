import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FaChevronLeft,
  FaTrash,
  FaCalendarAlt,
  FaRupeeSign,
  FaPercentage,
  FaChartPie,
  FaSignOutAlt,
} from "react-icons/fa";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { globalStore } from "@/store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function Basket() {
  const [pendingExit, setPendingExit] = useState(false);
  const [localExited, setLocalExited] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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
    return null;
  }

  // Calculate values
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

      // Prepare payload and call exit_basket with up-to-date prices
      const payload = {
        exit_basket: {
          basket_id: basket!.id,
          stocks: stocksToExit,
          sell_date: new Date().toISOString().split("T")[0],
        },
      };
      const { error } = await supabase.rpc("exit_basket", payload);

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

  // Delete basket logic using delete_basket function
  async function handleDeleteBasket() {
    try {
      // Call the backend delete_basket function with basket id
      const { error } = await supabase.rpc("delete_basket", {
        basket_id: basket!.id,
      });
      if (error) {
        toast.error("Failed to delete basket. Try again.");
        return;
      }
      // Remove from local store
      globalStore
        .getState()
        .setBaskets(baskets.filter((b) => b.id !== basket!.id));
      toast.success("Basket deleted.");
      window.location.href = "/";
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to delete basket.";
      toast.error(errorMsg);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8 px-6 py-8 text-gray-800">
      {/* Back Button */}
      <div className="mb-2">
        <Link
          to="/"
          className="mt-1 flex items-center gap-2 text-base text-gray-500 hover:text-gray-700"
        >
          <FaChevronLeft className="h-4 w-4" />
          <span className="text-base text-gray-500">Back</span>
        </Link>
      </div>

      {/* Performance Summary */}
      <div className="relative rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        {allExited && (
          <Button
            variant="outline"
            className="absolute top-6 right-6 flex h-8 items-center gap-2 rounded-xl border-red-400 px-3 py-1 text-xs font-semibold text-red-500 shadow-sm transition-colors duration-200 hover:bg-red-50 hover:text-red-600 focus:ring-red-400"
            style={{ borderWidth: 1, minWidth: 0 }}
            onClick={() => setShowDeleteConfirm(true)}
          >
            <FaTrash className="h-3 w-3" />
            Delete
          </Button>
        )}
        <h2 className="mb-1 text-lg font-semibold text-gray-900">
          {basket.name}
        </h2>
        <p className="mb-4 flex items-center gap-1 text-xs font-medium text-gray-500">
          <FaCalendarAlt className="h-3 w-3 text-gray-400" />
          Invested on: {new Date(basket.created_at).toLocaleDateString()}
        </p>
        <div className="flex flex-col text-sm text-gray-700 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="flex-1 space-y-4">
            <div>
              <p className="flex items-center gap-1 text-xs text-gray-500">
                <FaRupeeSign className="h-3 w-3 text-gray-400" />
                Invested
              </p>
              <p className="text-base font-medium text-gray-900">
                ₹{invested.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="flex items-center gap-1 text-xs text-gray-500">
                <FaRupeeSign className="h-3 w-3 text-gray-400" />
                Total Return
              </p>
              <p
                className={`text-base font-medium ${
                  totalReturn > 0
                    ? "text-green-600"
                    : totalReturn < 0
                      ? "text-red-500"
                      : "text-gray-500"
                }`}
              >
                {totalReturn > 0 ? "+" : totalReturn < 0 ? "-" : ""}₹
                {Math.abs(totalReturn).toLocaleString()}
              </p>
            </div>
            {allExited && (
              <div>
                <p className="flex items-center gap-1 text-xs text-gray-500">
                  <FaCalendarAlt className="h-3 w-3 text-gray-400" />
                  Exited on
                </p>
                <p className="text-sm font-medium text-gray-800">
                  {(() => {
                    const dates = basket.stocks
                      .map((s) => s.sell_date)
                      .filter((d) => d && typeof d === "string");
                    const latest = dates.sort().at(-1);
                    return latest ? new Date(latest).toLocaleDateString() : "-";
                  })()}
                </p>
              </div>
            )}
          </div>
          <div className="flex-1 space-y-4 border-t border-gray-100 pt-4 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6 sm:text-right">
            <div>
              <p className="flex items-center justify-start gap-1 text-xs text-gray-500 sm:justify-end">
                <FaRupeeSign className="h-3 w-3 text-gray-400" />
                Current Value
              </p>
              <p className="text-base font-medium text-gray-900">
                ₹{currentValue.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="flex items-center justify-start gap-1 text-xs text-gray-500 sm:justify-end">
                <FaPercentage className="h-3 w-3 text-gray-400" />
                Return
              </p>
              <p
                className={`text-base font-medium ${
                  returnPercent > 0
                    ? "text-green-600"
                    : returnPercent < 0
                      ? "text-red-500"
                      : "text-gray-500"
                }`}
              >
                {returnPercent > 0 ? "+" : returnPercent < 0 ? "-" : ""}
                {Math.abs(returnPercent).toFixed(2)}%
              </p>
            </div>
            {allExited && (
              <div>
                <p className="flex items-center justify-start gap-1 text-xs text-gray-500 sm:justify-end">
                  <FaCalendarAlt className="h-3 w-3 text-gray-400" />
                  Days Invested
                </p>
                <p className="text-sm font-medium text-gray-800">
                  {(() => {
                    const investDate = new Date(
                      new Date(basket.created_at).toDateString(),
                    );
                    const dates = basket.stocks
                      .map((s) => s.sell_date)
                      .filter((d) => d && typeof d === "string");
                    const latest = dates.sort().at(-1);
                    const exitDate = latest
                      ? new Date(new Date(latest).toDateString())
                      : new Date();
                    const diffInMs = exitDate.getTime() - investDate.getTime();
                    const diffInDays = Math.floor(
                      diffInMs / (1000 * 60 * 60 * 24),
                    );
                    return `${diffInDays} days`;
                  })()}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stock Breakdown */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4 text-base font-semibold text-gray-700">
          <FaChartPie className="h-4 w-4 text-gray-500" />
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
            // Always neutral color for value; only return percent is color-coded
            const valueClass = "text-right font-light text-gray-800";
            let stockReturnPercentClass = "text-gray-500";
            // Use direct >= and <= logic for precision checks
            if (stockReturnPercent >= 0.01)
              stockReturnPercentClass = "text-green-600";
            else if (stockReturnPercent <= -0.01)
              stockReturnPercentClass = "text-red-500";
            let stockReturnPercentSign = "";
            if (stockReturnPercent >= 0.01) stockReturnPercentSign = "+";
            else if (stockReturnPercent <= -0.01) stockReturnPercentSign = "-";
            return (
              <li
                key={stock.symbol}
                className="flex items-center justify-between px-5 py-4 text-sm"
              >
                <span className="block font-medium text-gray-800">
                  {stock.symbol}
                  <span className="mt-0.5 block text-xs text-gray-500">
                    {stock.name}
                  </span>
                </span>
                <span className={valueClass}>
                  ₹{stockCurrent.toLocaleString()} <br />
                  <span className="text-xs font-normal">
                    <span className={stockReturnPercentClass}>
                      {stockReturnPercentSign}
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
        <Button
          onClick={() => setShowExitConfirm(true)}
          disabled={allExited || pendingExit}
          className="w-full bg-red-500 px-5 py-3 text-base font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
        >
          {(() => {
            if (allExited)
              return (
                <span className="flex items-center justify-center gap-2">
                  <FaSignOutAlt className="h-4 w-4" />
                  Exit taken
                </span>
              );
            if (pendingExit)
              return (
                <span className="flex items-center justify-center gap-2">
                  <FaSignOutAlt className="h-4 w-4 animate-pulse" />
                  Exiting...
                </span>
              );
            return (
              <span className="flex items-center justify-center gap-2">
                <FaSignOutAlt className="h-4 w-4" />
                Exit Basket
              </span>
            );
          })()}
        </Button>
      </div>

      {/* Exit Confirmation Dialog */}
      <Dialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <DialogContent className="max-w-sm rounded-2xl border border-gray-200 bg-white p-0 shadow-xl">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="text-lg font-semibold text-gray-900">
              Are you sure you want to exit this basket?
            </DialogTitle>
            <DialogDescription className="pt-1 text-sm text-gray-500">
              This action will exit all stocks in this basket at the latest
              prices. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row justify-end gap-2 px-6 pt-4 pb-6">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowExitConfirm(false)}
            >
              No
            </Button>
            <Button
              className="flex-1 bg-red-600 text-white hover:bg-red-700"
              onClick={async () => {
                setShowExitConfirm(false);
                await handleExitBasket();
              }}
            >
              Yes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm rounded-2xl border border-gray-200 bg-white p-0 shadow-xl">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="text-lg font-semibold text-gray-900">
              Are you sure you want to delete this basket?
            </DialogTitle>
            <DialogDescription className="pt-1 text-sm text-gray-500">
              This action will permanently delete this basket and all its data.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row justify-end gap-2 px-6 pt-4 pb-6">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowDeleteConfirm(false)}
            >
              No
            </Button>
            <Button
              className="flex-1 border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700 focus:ring-red-400"
              variant="outline"
              style={{ borderWidth: 1 }}
              onClick={async () => {
                setShowDeleteConfirm(false);
                await handleDeleteBasket();
              }}
            >
              Yes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
