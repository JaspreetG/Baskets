import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FaArrowLeft, FaRupeeSign } from "react-icons/fa";
import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { useNavigationType } from "react-router-dom";

export default function InvestBasket() {
  const navType = useNavigationType();
  const hasMounted = useRef(false);

  useEffect(() => {
    hasMounted.current = true;
  }, []);

  const isBack = navType === "POP";
  const shouldAnimate = !isBack && hasMounted.current;

  const stocks = [
    { code: "INFY", name: "Infosys Ltd", quantity: 2, price: 1500 },
    {
      code: "TCS",
      name: "Tata Consultancy Services",
      quantity: 1,
      price: 3300,
    },
    { code: "RELIANCE", name: "Reliance Industries", quantity: 3, price: 2700 },
  ];

  const total = stocks.reduce((acc, s) => acc + s.quantity * s.price, 0);

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
          <div className="flex items-center gap-2 text-base font-medium text-gray-600">
            <FaArrowLeft className="h-4 w-4" />
            <span>Basket</span>
          </div>
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
              className="rounded-lg py-6 pl-9 text-base"
            />
          </div>
        </div>

        {/* Stock List */}
        <Card className="rounded-xl border border-gray-200 bg-gray-50/50 py-0 shadow-sm">
          <ScrollArea className="max-h-[30vh]">
            <ul className="divide-y divide-gray-200">
              {stocks.map((stock) => (
                <li
                  key={stock.code}
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
                      Qty: {stock.quantity}
                    </span>
                    <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                      ₹{stock.quantity * stock.price}
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
            Total: ₹{total}
          </div>
          <Button className="w-full bg-blue-600 px-4 py-6 text-base text-white hover:bg-blue-700 sm:w-auto sm:px-10">
            Invest
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
