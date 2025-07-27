import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

import {
  FaChevronLeft,
  FaRupeeSign,
  FaBox,
  FaMoneyBillWave,
  FaChartBar,
  FaBoxOpen,
  FaBarcode,
  FaHashtag,
  FaTag,
  FaPercentage,
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

  const distributedStocks = (() => {
    const n = stocks.length;
    if (n === 0 || parsedAmount <= 0) return [];

    const baseAmount = parsedAmount / n;
    const allocated = stocks.map((s) => {
      const ltp = Number(s.ltp) || 0;
      const quantity = ltp > 0 ? Math.floor(baseAmount / ltp) : 0;
      return {
        ...s,
        ltp: Number(ltp.toFixed(2)),
        buy_price: Number(ltp.toFixed(2)),
        quantity,
        cost: quantity * ltp,
      };
    });

    let remaining =
      parsedAmount - allocated.reduce((acc, s) => acc + s.cost, 0);

    while (remaining > 0.01) {
      // Sort by lowest allocation first
      allocated.sort((a, b) => a.quantity * a.ltp - b.quantity * b.ltp);
      let allocatedFlag = false;

      for (let i = 0; i < n; i++) {
        const stock = allocated[i];
        if (stock.ltp <= 0) continue;
        if (remaining >= stock.ltp) {
          stock.quantity += 1;
          stock.cost += stock.ltp;
          remaining -= stock.ltp;
          allocatedFlag = true;
          break;
        }
      }

      if (!allocatedFlag) break;
    }

    return allocated;
  })();

  const total = distributedStocks.reduce(
    (acc, s) => acc + s.quantity * (Number(s.ltp) || 0),
    0,
  );

  // React Query mutation for investing
  type InvestStock = {
    code: string;
    name: string;
    quantity: number;
    ltp: number;
  };
  type InvestParams = { basketName: string; distributedStocks: InvestStock[] };
  const investMutation = useMutation({
    mutationFn: async (params: InvestParams) => {
      return await supabase.rpc("create_basket_with_stocks", {
        basket_name: params.basketName,
        stock_list: params.distributedStocks.map((s: InvestStock) => ({
          symbol: s.code,
          name: s.name,
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
        <div className="mt-3 mb-4 flex items-center justify-between">
          <Link
            to="/search"
            className="mt-1 flex items-center gap-2 text-base text-gray-500 hover:text-gray-700"
          >
            <FaChevronLeft className="h-4 w-4" />
            <span className="text-base text-gray-500">Create Basket</span>
          </Link>
        </div>
        <div className="mb-6 text-sm text-gray-600">
          <p>
            Enter your basket name and the amount you want to invest. We'll help
            you distribute the amount across selected stocks.
          </p>
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
                placeholder="write basket name"
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
                  placeholder="enter amount"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white py-3 pl-9 text-base placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          </div>

          <hr className="my-6 border-t border-gray-200" />

          {stocks.length > 0 && (
            <>
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
                            Symbol
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
                        <th className="px-5 py-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2">
                            <FaPercentage className="h-3 w-3 text-gray-400" />
                            Allocation
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-sm text-gray-700">
                      {stocks.map((stock, idx) => {
                        const dist = distributedStocks.find(
                          (s) => s.code === stock.code,
                        );
                        const quantity = dist
                          ? dist.quantity
                          : (stock.quantity ?? 0);
                        const ltp = Number(stock.ltp) || 0;
                        const allocation =
                          total > 0 ? ((quantity * ltp) / total) * 100 : 0;

                        return (
                          <tr
                            key={stock.code + "-" + idx}
                            className="align-middle"
                          >
                            <td className="max-w-xs truncate px-5 py-4">
                              <div className="font-medium text-gray-900">
                                {stock.code}
                              </div>
                              {stock.name && stock.name !== stock.code && (
                                <div className="max-w-[120px] truncate text-xs text-gray-500 sm:max-w-[180px] sm:whitespace-nowrap">
                                  {stock.name}
                                </div>
                              )}
                            </td>
                            <td className="px-5 py-4 text-center whitespace-nowrap tabular-nums">
                              {quantity}
                            </td>
                            <td className="px-5 py-4 text-center whitespace-nowrap tabular-nums">
                              ₹{ltp.toFixed(2)}
                            </td>
                            <td className="px-5 py-4 text-center whitespace-nowrap tabular-nums">
                              {allocation.toFixed(2)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
              <div className="mt-6 text-sm text-gray-600">
                <p>
                  Buy the suggested quantities from your preferred broker app,
                  then return and click{" "}
                  <span className="font-medium text-blue-600">Invest</span> to
                  track your basket's performance.
                </p>
              </div>
            </>
          )}

          {stocks.length === 0 && (
            <div className="mt-8">
              <Card className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500 shadow-sm ring-1 ring-gray-100">
                <div className="flex flex-col items-center justify-center gap-3">
                  <FaBoxOpen className="h-8 w-8 text-gray-400" />
                  <div className="text-base font-medium">
                    Add stocks to invest
                  </div>
                </div>
              </Card>
            </div>
          )}

          <hr className="my-6 border-t border-gray-200" />

          <div className="mt-8 flex items-center justify-between px-2 text-base font-medium text-gray-700 sm:px-4 sm:text-sm">
            <span className="flex items-center gap-2 text-gray-600">
              <FaBoxOpen className="text-gray-400" />
              Total Investment
            </span>
            <span className="text-gray-900 tabular-nums">
              ₹{total.toFixed(2)}
            </span>
          </div>

          <div className="mt-8 mb-16">
            <Button
              type="submit"
              disabled={
                investMutation.status === "pending" ||
                distributedStocks.length === 0 ||
                total <= 0
              }
              className="w-full rounded-lg bg-blue-600 px-6 py-4 text-base font-medium text-white shadow-md transition-all hover:bg-blue-700 hover:shadow-lg disabled:opacity-50"
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
