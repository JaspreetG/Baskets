import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { FaArrowLeft } from "react-icons/fa";
import { Link, useNavigationType } from "react-router-dom";
import { motion } from "framer-motion";

export default function SearchBasket() {
  const navType = useNavigationType();
  const hasMounted = useRef(false);

  useEffect(() => {
    hasMounted.current = true;
  }, []);

  const isBack = navType === "POP";
  const shouldAnimate = !isBack && hasMounted.current;

  return (
    <motion.div
      className="mx-auto w-full max-w-2xl px-6 text-gray-700 md:px-8"
      initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
      animate={{ opacity: 1, y: 0 }}
      exit={shouldAnimate ? { opacity: 0, y: 20 } : {}}
      transition={{ duration: 0.35, ease: "easeInOut" }}
    >
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-base font-medium text-gray-500">
          <FaArrowLeft className="h-4 w-4" />
          <span>Add Stocks</span>
        </div>
        <Link to="/invest">
          <Button
            variant="ghost"
            className="h-auto px-4 py-1.5 text-base text-blue-600 hover:text-blue-700"
          >
            Done
          </Button>
        </Link>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          type="text"
          placeholder="Search for stocks..."
          className="w-full rounded-md border border-gray-300 bg-white px-10 py-3 text-base text-gray-800 shadow-sm placeholder:text-gray-400 focus:border-gray-500 focus:ring-2 focus:ring-gray-300 focus:outline-none"
        />
      </div>

      {/* Stock List */}
      <ul className="divide-y divide-gray-200 overflow-hidden rounded-xl bg-white shadow-md">
        {[
          { code: "HINDUNILVR", name: "Hindustan Unilever Ltd" },
          { code: "HAL", name: "Hindustan Aeronautics Ltd" },
          { code: "HINDZINC", name: "Hindustan Zinc Ltd" },
          { code: "HINDPETRO", name: "Hindustan Petroleum Corp Ltd" },
          { code: "HINDCOPPER", name: "Hindustan Copper Ltd" },
          { code: "HNDFDS", name: "Hindustan Foods Ltd" },
          { code: "HCC", name: "Hindustan Construction Company Ltd" },
        ].map((stock) => (
          <li
            key={stock.code}
            className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-gray-50"
          >
            <div className="flex-1">
              <div className="text-sm font-semibold text-gray-700">
                {stock.code}
              </div>
              <div className="text-xs leading-snug text-gray-500">
                {stock.name}
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="text-blue-600 hover:text-blue-700"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
