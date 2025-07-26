import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
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
          className="flex items-center gap-2 text-base font-medium text-gray-600 hover:text-gray-900"
        >
          <FaArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Link>
      </div>

      {/* Performance Summary */}
      <div className="relative rounded-2xl border border-gray-100 bg-gradient-to-br from-white to-gray-50 p-6 shadow-[0_12px_32px_rgba(0,0,0,0.06)] backdrop-blur">
        {/* Delete Basket Button: Only show if exit is taken */}
        {allExited && (
          <Button
            variant="outline"
            className="absolute top-6 right-6 h-8 rounded-full border-red-500 px-3 py-1 text-xs font-semibold text-red-600 shadow-sm hover:bg-red-50 hover:text-red-700 focus:ring-red-400"
            style={{ borderWidth: 1, minWidth: 0 }}
            onClick={() => setShowDeleteConfirm(true)}
          >
            Delete
          </Button>
        )}
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
            {(() => {
              let totalReturnClass = "text-sm font-medium ";
              if (totalReturn === 0) {
                totalReturnClass += "text-gray-500";
              } else if (totalReturn > 0) {
                totalReturnClass += "text-green-600";
              } else {
                totalReturnClass += "text-red-500";
              }
              let totalReturnSign = "";
              if (totalReturn > 0) totalReturnSign = "+";
              else if (totalReturn < 0) totalReturnSign = "-";
              let returnPercentClass = "";
              if (returnPercent === 0) returnPercentClass = "text-gray-500";
              else if (returnPercent > 0) returnPercentClass = "text-green-600";
              else returnPercentClass = "text-red-500";
              let returnPercentSign = "";
              if (returnPercent > 0) returnPercentSign = "+";
              else if (returnPercent < 0) returnPercentSign = "-";
              return (
                <p className={totalReturnClass}>
                  {totalReturnSign}₹{Math.abs(totalReturn).toLocaleString()} ({" "}
                  <span className={returnPercentClass}>
                    {returnPercentSign}
                    {Math.abs(returnPercent).toFixed(2)}%
                  </span>{" "}
                  )
                </p>
              );
            })()}
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
            let stockReturnPercentClass = "text-gray-500";
            if (stockReturnPercent > 0)
              stockReturnPercentClass = "text-green-600";
            else if (stockReturnPercent < 0)
              stockReturnPercentClass = "text-red-500";
            let stockReturnPercentSign = "";
            if (stockReturnPercent > 0) stockReturnPercentSign = "+";
            else if (stockReturnPercent < 0) stockReturnPercentSign = "-";
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
          className="w-full bg-red-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
        >
          {(() => {
            if (allExited) return "Exit taken";
            if (pendingExit) return "Exiting...";
            return "Exit Basket";
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
            <Button variant="outline" onClick={() => setShowExitConfirm(false)}>
              No
            </Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={async () => {
                setShowExitConfirm(false);
                await handleExitBasket();
              }}
            >
              Yes, Exit
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
              onClick={() => setShowDeleteConfirm(false)}
            >
              No
            </Button>
            <Button
              className="border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700 focus:ring-red-400"
              variant="outline"
              style={{ borderWidth: 1 }}
              onClick={async () => {
                setShowDeleteConfirm(false);
                await handleDeleteBasket();
              }}
            >
              Yes, Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
