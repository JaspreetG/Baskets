import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  FaArrowLeft,
  FaRupeeSign,
  FaBox,
  FaMoneyBillWave,
  FaChartBar,
  FaBoxOpen,
  FaBarcode,
  FaHashtag,
  FaTag,
} from "react-icons/fa";
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
    <div className="flex min-h-screen flex-col justify-between bg-white text-gray-700">
      {/* Header */}
      <div className="mx-auto w-full max-w-2xl px-6 md:px-8">
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/search"
            className="flex items-center gap-2 text-base font-medium text-gray-600 transition-colors hover:text-gray-800"
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
          <div className="mb-10 space-y-6">
            <div className="flex items-center gap-4">
              <label
                htmlFor="basketName"
                className="flex min-w-[140px] items-center gap-2 text-sm font-medium text-gray-700"
              >
                <FaBox className="text-gray-400" />
                Basket Name
              </label>
              <Input
                id="basketName"
                type="text"
                placeholder="e.g., Tech Picks"
                value={basketName}
                onChange={(e) => setBasketName(e.target.value)}
                className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-3 text-base placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div className="flex items-center gap-4">
              <label
                htmlFor="amount"
                className="flex min-w-[140px] items-center gap-2 text-sm font-medium text-gray-700"
              >
                <FaMoneyBillWave className="text-gray-400" />
                Amount to Invest
              </label>
              <div className="relative w-full">
                <FaRupeeSign className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter amount..."
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white py-3 pl-9 text-base placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          </div>

          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
            <FaChartBar className="text-gray-400" />
            Allocated Stocks
          </h3>
          {/* Stock List */}
          <Card className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm ring-1 ring-gray-100">
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto divide-y divide-gray-200">
                <thead className="bg-white">
                  <tr className="text-left text-xs font-semibold text-gray-500">
                    <th className="w-full max-w-xs truncate px-5 py-3">
                      <div className="flex items-center gap-2">
                        <FaBarcode className="text-gray-400" />
                        Stock
                      </div>
                    </th>
                    <th className="px-5 py-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <FaHashtag className="text-gray-400" />
                        Quantity
                      </div>
                    </th>
                    <th className="px-5 py-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <FaTag className="text-gray-400" />
                        Price
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-sm text-gray-700">
                  {distributedStocks.map((stock, idx) => (
                    <tr key={stock.code + "-" + idx} className="align-middle">
                      <td className="max-w-xs truncate px-5 py-4">
                        <div className="truncate font-medium text-gray-900">
                          {stock.code}
                        </div>
                        <div className="truncate text-sm text-gray-500">
                          {stock.name}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center whitespace-nowrap tabular-nums">
                        {stock.quantity}
                      </td>
                      <td className="px-5 py-4 text-center whitespace-nowrap tabular-nums">
                        ₹{stock.ltp.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          {/* Invest Button & Total Investment */}
          <div className="mt-12 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 text-base text-gray-600 sm:text-sm">
              <FaBoxOpen className="text-gray-400" />
              <span className="text-gray-500">Total Investment</span>
              <span className="ml-1 font-semibold text-gray-800 tabular-nums">
                ₹{total.toFixed(2)}
              </span>
            </div>
            <Button
              type="submit"
              disabled={
                investMutation.status === "pending" ||
                distributedStocks.length === 0 ||
                total <= 0
              }
              className="w-full max-w-xs rounded-lg bg-blue-600 px-6 py-4 text-base font-medium text-white shadow-md transition-all hover:bg-blue-700 hover:shadow-lg disabled:opacity-50"
            >
              {(() => {
                if (investMutation.status === "pending") return "Investing...";
                if (distributedStocks.length === 0 || total <= 0)
                  return "Add stocks to invest";
                return "Invest";
              })()}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
