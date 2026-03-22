import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  FaChevronLeft,
  FaTrash,
  FaSignOutAlt
} from "react-icons/fa";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { globalStore } from "@/store";
import type { Basket } from "@/store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
// Convert any date (string or Date) to IST date string: dd/mm/yyyy
function getISTDateString(date: Date | string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

// Convert any date (string or Date) to IST ISO string: yyyy-mm-ddTHH:mm:ss.sssZ
function toISTISOString(date: Date | string): string {
  const istDate = new Date(
    new Date(date).toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
  );
  return istDate.toISOString();
}

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
  const setBaskets = globalStore((s) => s.setBaskets);
  const updateBasketLTP = globalStore((s) => s.updateBasketLTP);
  // Coerce both sides to string because backend may return numeric ids
  const basket = baskets.find((b) => String(b.id) === String(basketId));

  useEffect(() => {
    hasMounted.current = true;
  }, []);

  // If store is empty (e.g. on page refresh), fetch baskets from backend
  useEffect(() => {
    async function ensureBaskets() {
      try {
        if (!baskets || baskets.length === 0) {
          const { data } = await supabase.rpc("get_all_baskets_with_stocks");
          if (data && Array.isArray(data)) {
            // data matches server Basket shape; cast to the local Basket type
            setBaskets(data as unknown as Basket[]);
            // after setting baskets, we'll fetch LTPs for the current basket below in a separate effect
          }
        }
      } catch {
        // ignore fetch errors here; UI will handle empty state
      }
    }
    ensureBaskets();
  }, [baskets, setBaskets]);

  // Fetch LTPs for this basket if they are missing (happens on refresh when dashboard didn't run)
  const [ltpFetched, setLtpFetched] = useState(false);
  useEffect(() => {
    if (!basket || ltpFetched) return;
    // Only fetch if at least one non-exited stock lacks ltp
    const needsLtp = basket.stocks.some((s) => {
      const isExited =
        s.sell_price != null &&
        typeof s.sell_date === "string" &&
        s.sell_date.trim() !== "" &&
        !isNaN(Date.parse(s.sell_date));
      return !isExited && (s.ltp == null || s.ltp === 0);
    });
    if (!needsLtp) {
      setLtpFetched(true);
      return;
    }

    (async () => {
      try {
        await Promise.all(
          basket.stocks.map(async (stock) => {
            // skip exited stocks
            const isExited =
              stock.sell_price != null &&
              typeof stock.sell_date === "string" &&
              stock.sell_date.trim() !== "" &&
              !isNaN(Date.parse(stock.sell_date));
            if (isExited) return;
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
              if (data && typeof data.ltp === "number") {
                updateBasketLTP(String(basket.id), stock.symbol, data.ltp);
              }
            } catch {
              // ignore individual failures
            }
          }),
        );
      } finally {
        setLtpFetched(true);
      }
    })();
  }, [basket, updateBasketLTP, ltpFetched]);

  if (!basketId || !basket) {
    return null;
  }

  // Calculate values
  let totalBuyValue = 0;
  let totalSellValue = 0;
  // Always use basket.created_at as the base date (same fix as Dashboard)
  const earliestDate: string | undefined = basket.created_at ?? undefined;
  let latestSellDate: string | undefined = undefined;
  basket.stocks.forEach((s) => {
    const qty = s.quantity ?? 0;
    const buyPrice = s.buy_price ?? 0;
    totalBuyValue += qty * buyPrice;
    const hasSell =
      s.sell_price != null &&
      !isNaN(Number(s.sell_price)) &&
      typeof s.sell_date === "string" &&
      s.sell_date.trim() !== "" &&
      !isNaN(Date.parse(s.sell_date));
    const sellOrLtp = hasSell
      ? Number(s.sell_price)
      : Number(s.ltp ?? s.buy_price ?? 0);
    totalSellValue += qty * sellOrLtp;
    // Find latest sell date if available
    if (
      typeof s.sell_date === "string" &&
      s.sell_date.trim() !== "" &&
      !isNaN(Date.parse(s.sell_date))
    ) {
      if (
        !latestSellDate ||
        new Date(toISTISOString(s.sell_date)) >
          new Date(toISTISOString(latestSellDate))
      ) {
        latestSellDate = s.sell_date;
      }
    }
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

  // Consistent IST date formatting for invested on, exit date, and days invested
  const investedOnDateIST =
    earliestDate !== undefined ? getISTDateString(earliestDate) : "-";
  const exitDateIST =
    latestSellDate !== undefined ? getISTDateString(latestSellDate) : "-";

  // Days invested calculation (using IST, truncating both dates to 00:00 IST)
  let investedDays = 0;
  if (earliestDate) {
    // Always use IST, truncate to date only before subtracting
    const investedDateIST = new Date(toISTISOString(earliestDate));
    investedDateIST.setHours(0, 0, 0, 0);
    if (latestSellDate) {
      const sellDateIST = new Date(toISTISOString(latestSellDate));
      sellDateIST.setHours(0, 0, 0, 0);
      investedDays = Math.max(0, Math.floor(
        (sellDateIST.getTime() - investedDateIST.getTime()) /
          (1000 * 60 * 60 * 24),
      ));
    } else {
      const now = new Date();
      const todayIST = new Date(
        new Date(now).toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
      );
      todayIST.setHours(0, 0, 0, 0);
      investedDays = Math.max(0, Math.floor(
        (todayIST.getTime() - investedDateIST.getTime()) /
          (1000 * 60 * 60 * 24),
      ));
    }
  }

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
    <div className="mx-auto w-full max-w-4xl space-y-10 px-4 py-8 md:px-8 text-slate-800">
      {/* Back Button */}
      <div className="mb-6 flex flex-row items-center justify-between gap-4">
        <Link
          to="/"
          className="flex h-10 items-center justify-center gap-2 rounded-full bg-slate-100 px-4 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-900"
        >
          <FaChevronLeft className="h-3.5 w-3.5" />
          <span>Back</span>
        </Link>
        {allExited && (
          <Button
            variant="outline"
            className="flex h-10 items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 text-xs font-bold text-rose-600 transition-all duration-300 hover:bg-rose-100 hover:text-rose-700"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <FaTrash className="h-3.5 w-3.5" />
            Delete
          </Button>
        )}
      </div>

      {/* Performance Summary */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-white/70 backdrop-blur-3xl p-5 sm:p-8 md:p-12 shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-white/80">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-blue-300/10 blur-[100px] mix-blend-overlay"></div>
        
        <div className="relative z-10">
          <div className="mb-6 sm:mb-10">
            <h2 className="mb-2 sm:mb-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 font-heading">
              {basket.name}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-medium text-slate-500">
              <span className="rounded-md bg-slate-50 px-2.5 py-1 ring-1 ring-slate-200/50">Invested: <strong className="text-slate-700">{investedOnDateIST}</strong></span>
              {allExited && (
                <span className="rounded-md bg-slate-50 px-2.5 py-1 ring-1 ring-slate-200/50">Sold: <strong className="text-slate-700">{exitDateIST}</strong></span>
              )}
              <span className="rounded-md bg-slate-50 px-2.5 py-1 ring-1 ring-slate-200/50">Duration: <strong className="text-slate-700">{investedDays} days</strong></span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row w-full gap-4 sm:gap-8 border-t border-slate-900/5 pt-5 sm:pt-8 relative">
            <div className="flex items-center justify-between sm:block sm:flex-1 pb-4 sm:pb-0 border-b sm:border-b-0 border-slate-900/5 sm:space-y-1.5">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-slate-500">
                Invested
              </span>
              <p className="text-base sm:text-xl font-bold text-slate-800 tabular-nums">
                ₹{invested.toLocaleString()}
              </p>
            </div>
            
            <div className="flex items-center justify-between sm:block sm:flex-1 pb-4 sm:pb-0 border-b sm:border-b-0 border-slate-900/5 sm:border-l sm:border-slate-900/5 sm:pl-8 sm:space-y-1.5">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-slate-500">
                {allExited ? "Final Value" : "Current Value"}
              </span>
              <p className="text-base sm:text-xl font-bold text-slate-800 tabular-nums">
                ₹{currentValue.toLocaleString()}
              </p>
            </div>
            
            <div className="flex items-center justify-between sm:block sm:flex-1 sm:border-l sm:border-slate-900/5 sm:pl-8 sm:space-y-1.5">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-slate-500">
                Total Return
              </span>
              <div className="flex items-center sm:items-baseline gap-2 text-right sm:text-left">
                <p className={`text-base sm:text-xl font-bold tabular-nums ${totalReturn > 0 ? "text-emerald-600" : totalReturn < 0 ? "text-rose-500" : "text-slate-600"}`}>
                  {totalReturn > 0 ? "+" : totalReturn < 0 ? "-" : ""}₹{Math.abs(totalReturn).toLocaleString()}
                </p>
                <div className={`px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] uppercase tracking-wider font-bold ${
                    returnPercent > 0
                      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/50"
                      : returnPercent < 0
                        ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200/50"
                        : "bg-slate-100 text-slate-600"
                  }`}>
                  {returnPercent > 0 ? "+" : returnPercent < 0 ? "-" : ""}{Math.abs(returnPercent).toFixed(2)}%
                </div>
              </div>
            </div>

            {/* CAGR */}
            {investedDays > 0 && invested > 0 && currentValue > 0 && (
              <div className="flex items-center justify-between sm:block sm:flex-1 sm:border-l sm:border-slate-900/5 sm:pl-8 sm:space-y-1.5">
                <span className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-slate-500">
                  CAGR
                </span>
                {(() => {
                  const yearsHeld = investedDays / 365;
                  if (yearsHeld <= 0 || invested <= 0) return <p className="text-base sm:text-xl font-bold tabular-nums text-slate-600">N/A</p>;
                  const cagrVal = (Math.pow(currentValue / invested, 1 / yearsHeld) - 1) * 100;
                  if (!isFinite(cagrVal) || isNaN(cagrVal)) return <p className="text-base sm:text-xl font-bold tabular-nums text-slate-600">N/A</p>;
                  const cagrColor = cagrVal > 0.01 ? "text-emerald-600" : cagrVal < -0.01 ? "text-rose-500" : "text-slate-600";
                  return (
                    <p className={`text-base sm:text-xl font-bold tabular-nums ${cagrColor}`}>
                      {cagrVal >= 0 ? "+" : ""}{cagrVal.toFixed(2)}%
                    </p>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stock Breakdown */}
      <div className="overflow-hidden rounded-[2.5rem] bg-white/60 backdrop-blur-3xl shadow-[0_8px_30px_rgba(0,0,0,0.03)] border border-white/60 mt-8">
        <div className="border-b border-slate-900/5 bg-white/40 px-5 sm:px-6 py-5 text-[11px] sm:text-xs font-bold uppercase tracking-widest text-slate-500">
          Composition Summary
        </div>
        <div className="divide-y divide-slate-900/5">
          {basket.stocks.map((stock) => {
            const stockInvested =
              (stock.quantity ?? 0) * (stock.buy_price ?? 0);
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
            
            let stockReturnPercentClass = "text-slate-500 ring-slate-200 bg-slate-50";
            if (stockReturnPercent >= 0.01)
              stockReturnPercentClass = "text-emerald-700 ring-emerald-200 bg-emerald-50";
            else if (stockReturnPercent <= -0.01)
              stockReturnPercentClass = "text-rose-700 ring-rose-200 bg-rose-50";
              
            let stockReturnPercentSign = "";
            if (stockReturnPercent >= 0.01) stockReturnPercentSign = "+";
            else if (stockReturnPercent <= -0.01) stockReturnPercentSign = "-";
                   return (
              <div
                key={stock.symbol}
                className="flex items-center justify-between p-4 sm:p-5 transition-colors hover:bg-white/40 gap-4"
              >
                <div className="flex items-center gap-3 sm:gap-4 min-w-0 pr-2">
                  <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm sm:text-base font-extrabold text-slate-700 ring-1 ring-slate-200/50 font-heading">
                    {stock.symbol.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <span className="block text-sm sm:text-base font-extrabold text-slate-900 font-heading truncate">
                      {stock.symbol}
                    </span>
                    <span className="mt-0.5 block text-[11px] sm:text-[13px] font-medium text-slate-500 truncate">
                      {stock.name} • {stock.quantity} shares
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-col items-end shrink-0 text-right space-y-0.5 sm:space-y-1">
                  <span className="text-sm sm:text-base font-bold text-slate-900 tabular-nums font-heading">
                    ₹{stockCurrent.toLocaleString()}
                  </span>
                  <span className={`inline-flex items-center rounded-md px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] uppercase tracking-wider font-bold ring-1 ${stockReturnPercentClass}`}>
                    {stockReturnPercentSign}{Math.abs(stockReturnPercent).toFixed(2)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Exit Basket button */}
      <div className="mb-16 pt-8">
        <Button
          onClick={() => setShowExitConfirm(true)}
          disabled={allExited || pendingExit}
          className="w-full rounded-full bg-primary-600 px-6 py-6 text-[17px] font-bold text-white shadow-[0_8px_25px_rgba(59,130,246,0.25)] transition-all hover:-translate-y-0.5 hover:bg-primary-500 hover:shadow-[0_12px_30px_rgba(59,130,246,0.35)] disabled:opacity-40 disabled:hover:translate-y-0"
        >
          {(() => {
            if (allExited)
              return (
                <span className="flex items-center justify-center gap-3">
                  <FaSignOutAlt size={18} />
                  Basket Exited Successfully
                </span>
              );
            if (pendingExit)
              return (
                <span className="flex items-center justify-center gap-3">
                  <FaSignOutAlt size={18} className="animate-pulse" />
                  Securing Exit Prices...
                </span>
              );
            return (
              <span className="flex items-center justify-center gap-3">
                <FaSignOutAlt size={18} />
                Exit Basket Now
              </span>
            );
          })()}
        </Button>
      </div>

      {/* Dialogs remain identical logically, just polished superficially */}
      <Dialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <DialogContent className="max-w-[92vw] sm:max-w-md rounded-[1.75rem] border border-slate-100 bg-white p-6 shadow-2xl sm:p-8">
          <DialogHeader className="space-y-4 pb-4 text-left">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-800">
              <FaSignOutAlt size={22} className="ml-1" />
            </div>
            <DialogTitle className="text-[22px] font-bold tracking-tight text-slate-900 font-heading">
              Exit Basket
            </DialogTitle>
            <DialogDescription className="text-[15px] font-medium leading-relaxed text-slate-500">
              This action will lock in current market prices for all holdings. It is permanent and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end sm:gap-4">
            <Button
              variant="outline"
              className="w-full sm:w-auto rounded-full py-5 px-6 text-[15px] font-bold text-slate-700 border-slate-200 hover:bg-slate-50 focus:ring-2 focus:ring-slate-200"
              onClick={() => setShowExitConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              className="w-full sm:w-auto rounded-full bg-primary-600 py-5 px-6 text-[15px] font-bold text-white shadow-[0_8px_20px_rgba(59,130,246,0.25)] hover:bg-primary-500 hover:shadow-[0_12px_25px_rgba(59,130,246,0.35)] focus:ring-2 focus:ring-primary-600 focus:ring-offset-2"
              onClick={async () => {
                setShowExitConfirm(false);
                await handleExitBasket();
              }}
            >
              Confirm Exit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-[92vw] sm:max-w-md rounded-[1.75rem] border border-slate-100 bg-white p-6 shadow-2xl sm:p-8">
          <DialogHeader className="space-y-4 pb-4 text-left">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <FaTrash size={20} />
            </div>
            <DialogTitle className="text-[22px] font-bold tracking-tight text-slate-900 font-heading">
              Delete Basket
            </DialogTitle>
            <DialogDescription className="text-[15px] font-medium leading-relaxed text-slate-500">
              You are about to permanently delete this basket's history. This data cannot be recovered.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end sm:gap-4">
            <Button
              variant="outline"
              className="w-full sm:w-auto rounded-full py-5 px-6 text-[15px] font-bold text-slate-700 border-slate-200 hover:bg-slate-50 focus:ring-2 focus:ring-slate-200"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              className="w-full sm:w-auto rounded-full bg-rose-600 py-5 px-6 text-[15px] font-bold text-white shadow-md shadow-rose-600/20 hover:bg-rose-700 focus:ring-2 focus:ring-rose-600 focus:ring-offset-2"
              onClick={async () => {
                setShowDeleteConfirm(false);
                await handleDeleteBasket();
              }}
            >
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
