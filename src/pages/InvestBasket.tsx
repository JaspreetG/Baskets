import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FaArrowLeft, FaRupeeSign } from "react-icons/fa";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useNavigationType, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { globalStore } from "@/store";
import { toast } from "sonner";

export default function InvestBasket() {
  const navType = useNavigationType();
  const hasMounted = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    hasMounted.current = true;
  }, []);

  const isBack = navType === "POP";
  const shouldAnimate = !isBack && hasMounted.current;

  const basketStocks = globalStore((state) => state.basketStocks);

  const [amount, setAmount] = useState("");
  const [debouncedAmount, setDebouncedAmount] = useState("");

  // Debounce amount input to avoid immediate calculations
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedAmount(amount);
    }, 400); // 400ms debounce
    return () => clearTimeout(handler);
  }, [amount]);

  const stocks = basketStocks.map((s) => ({
    code: s.symbol,
    name: s.name,
    ltp: s.ltp,
  }));

  // Parse amount as a number safely for calculations
  const parsedAmount = parseFloat(debouncedAmount) || 0;

  const distributedStocks = stocks.map((s) => {
    // Defensive: If ltp is 0 or falsy, avoid division by zero
    const ltp = Number(s.ltp) || 0;
    const equalShare = stocks.length > 0 ? parsedAmount / stocks.length : 0;
    const quantity = ltp > 0 ? Math.floor(equalShare / ltp) : 0;
    // Trim ltp to 2 decimal places for display
    return { ...s, ltp: Number(ltp.toFixed(2)), quantity };
  });

  const total = distributedStocks.reduce(
    (acc, s) => acc + s.quantity * (Number(s.ltp) || 0),
    0,
  );

  const [loading, setLoading] = useState(false);

  return (
    <motion.div
      className="flex h-screen flex-col justify-between bg-white text-gray-700"
      initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
      animate={{ opacity: 1, y: 0 }}
      exit={shouldAnimate ? { opacity: 0, y: 20 } : {}}
      transition={{ duration: 0.35, ease: "easeInOut" }}
    >
      {/* Header */}
      <div className="mx-auto w-full max-w-2xl px-6 md:px-8">
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/search"
            className="flex items-center gap-2 text-base font-medium text-gray-600"
          >
            <FaArrowLeft className="h-4 w-4" />
            <span>Basket</span>
          </Link>
        </div>

        {/* Amount Input */}
        <div className="mb-6">
          <label
            htmlFor="amount"
            className="mb-2 block text-[15px] font-medium text-gray-800"
          >
            Amount to Invest
          </label>
          <div className="relative">
            <FaRupeeSign className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount..."
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="rounded-lg py-6 pl-9 text-base"
            />
          </div>
        </div>

        {/* Stock List */}
        <Card className="rounded-xl border border-gray-200 py-0 shadow-sm">
          <ScrollArea className="max-h-[30vh]">
            <ul className="divide-y divide-gray-200">
              {distributedStocks.map((stock, idx) => (
                <li
                  key={stock.code + "-" + idx}
                  className="flex items-center justify-between px-5 py-3"
                >
                  <div>
                    <div className="text-[15px] font-medium text-gray-800">
                      {stock.code}
                    </div>
                    <div className="text-[13px] text-gray-500">
                      {stock.name}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                      quantity: {stock.quantity}
                    </span>
                    <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                      ₹{stock.ltp.toFixed(2)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </Card>
      </div>

      {/* Sticky Invest Button */}
      <div className="sticky bottom-0 left-0 w-full border-t border-gray-200 bg-white p-8">
        <div className="mx-auto flex max-w-2xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="rounded-md bg-gray-100 px-5 py-2.5 text-base text-gray-700">
            Total: ₹{total.toFixed(2)}
          </div>
          <Button
            onClick={async () => {
              setLoading(true);
              const { error } = await supabase.rpc(
                "create_basket_with_stocks",
                {
                  basket_name: "Dummy Basket",
                  stock_list: distributedStocks.map((s) => ({
                    symbol: s.code,
                    quantity: s.quantity,
                    buy_price: s.ltp,
                  })),
                },
              );
              setLoading(false);
              if (!error) {
                toast.success("Investment successful!");
                setTimeout(() => {
                  navigate("/");
                }, 800);
              } else {
                toast.error("Investment failed. Please try again.");
              }
            }}
            disabled={loading}
            className="w-full bg-blue-600 px-4 py-6 text-base text-white hover:bg-blue-700 disabled:opacity-50 sm:w-auto sm:px-10"
          >
            {loading ? "Investing..." : "Invest"}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
