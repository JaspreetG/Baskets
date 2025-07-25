import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FaArrowLeft, FaRupeeSign } from "react-icons/fa";
import { useEffect, useRef, useState } from "react";
import { useDebounce } from "@/lib/useDebounce";
import { useMutation } from "@tanstack/react-query";
import type { PostgrestSingleResponse } from "@supabase/postgrest-js";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { globalStore } from "@/store";
import { toast } from "sonner";

export default function InvestBasket() {
  const hasMounted = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    hasMounted.current = true;
  }, []);

  const basketStocks = globalStore((state) => state.basketStocks);

  const [basketName, setBasketName] = useState("");
  const [amount, setAmount] = useState("");
  // Debounce amount input to avoid immediate calculations (using custom hook)
  const debouncedAmount = useDebounce(amount, 400);

  // Use all BasketStock fields for calculation
  const stocks = basketStocks.map((s) => ({
    code: s.symbol,
    name: s.name,
    ltp: s.ltp ?? s.buy_price ?? 0,
    buy_price: s.buy_price,
    quantity: s.quantity,
  }));

  // Parse amount as a number safely for calculations
  const parsedAmount = parseFloat(debouncedAmount) || 0;

  const distributedStocks = stocks.map((s) => {
    // Defensive: If ltp is 0 or falsy, avoid division by zero
    const ltp = Number(s.ltp) || 0;
    const equalShare = stocks.length > 0 ? parsedAmount / stocks.length : 0;
    const quantity = ltp > 0 ? Math.floor(equalShare / ltp) : 0;
    // Use ltp as buy_price for new stocks
    return {
      ...s,
      ltp: Number(ltp.toFixed(2)),
      buy_price: Number(ltp.toFixed(2)),
      quantity,
    };
  });

  const total = distributedStocks.reduce(
    (acc, s) => acc + s.quantity * (Number(s.ltp) || 0),
    0,
  );

  // React Query mutation for investing
  type InvestStock = { code: string; quantity: number; ltp: number };
  type InvestParams = { basketName: string; distributedStocks: InvestStock[] };
  const investMutation = useMutation({
    mutationFn: async (params: InvestParams) => {
      return await supabase.rpc("create_basket_with_stocks", {
        basket_name: params.basketName,
        stock_list: params.distributedStocks.map((s: InvestStock) => ({
          symbol: s.code,
          quantity: s.quantity,
          buy_price: s.ltp,
        })),
      });
    },
    onSuccess: (data: PostgrestSingleResponse<unknown>) => {
      if (!data.error) {
        toast.success("Investment successful!");
        // Clear basketStocks in zustand/globalStore before navigating
        globalStore.setState({ basketStocks: [] });
        navigate("/");
      } else {
        toast.error("Investment failed. Please try again.");
      }
    },
    onError: () => {
      toast.error("Investment failed. Please try again.");
    },
  });

  return (
    <div className="flex h-screen flex-col justify-between bg-white text-gray-700">
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

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!basketName.trim() || !parsedAmount || total <= 0) {
              toast.error("Please enter a valid basket name and amount.");
              return;
            }
            investMutation.mutate({ basketName, distributedStocks });
          }}
        >
          {/* Basket Name Input */}
          <div className="mb-6">
            <label
              htmlFor="basketName"
              className="mb-2 block text-[15px] font-medium text-gray-800"
            >
              Basket Name
            </label>
            <Input
              id="basketName"
              type="text"
              placeholder="Enter basket name..."
              value={basketName}
              onChange={(e) => setBasketName(e.target.value)}
              className="rounded-lg px-4 py-6 text-base"
            />
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
            <ScrollArea>
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
                    <div className="flex flex-col items-end gap-1">
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
          {/* Invest Button */}
          <div className="mt-8">
            <div className="mx-auto flex max-w-2xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="rounded-md bg-gray-100 px-5 py-2.5 text-base text-gray-700">
                Total: ₹{total.toFixed(2)}
              </div>
              <Button
                type="submit"
                disabled={
                  investMutation.status === "pending" ||
                  distributedStocks.length === 0 ||
                  total <= 0
                }
                className="w-full bg-blue-600 px-4 py-6 text-base text-white hover:bg-blue-700 disabled:opacity-50 sm:w-auto sm:px-10"
              >
                {(() => {
                  if (investMutation.status === "pending")
                    return "Investing...";
                  if (distributedStocks.length === 0 || total <= 0)
                    return "Add stocks to invest";
                  return "Invest";
                })()}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
