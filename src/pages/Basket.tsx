import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { useNavigationType } from "react-router-dom";

export default function Basket() {
  const navType = useNavigationType();
  const hasMounted = useRef(false);

  useEffect(() => {
    hasMounted.current = true;
  }, []);

  const isBack = navType === "POP";
  const shouldAnimate = !isBack && hasMounted.current;

  return (
    <motion.div
      className="mx-auto w-full max-w-2xl space-y-8 px-6 py-8 text-gray-800"
      initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
      animate={{ opacity: 1, y: 0 }}
      exit={shouldAnimate ? { opacity: 0, y: 20 } : {}}
      transition={{ duration: 0.35, ease: "easeInOut" }}
    >
      {/* Performance Summary */}
      <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-white to-gray-50 p-6 shadow-[0_12px_32px_rgba(0,0,0,0.06)] backdrop-blur">
        <h2 className="mb-1 text-lg font-semibold text-gray-800">
          Green Energy
        </h2>
        <p className="mb-4 text-xs font-medium text-gray-500">
          Invested: Nov 18, 2023
        </p>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-500">Current Value</p>
            <p className="text-2xl font-bold text-gray-900">₹1,34,986</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Total Return</p>
            <p className="text-sm font-semibold text-green-600">
              +₹41,684 ( +1.23% )
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
          {[
            ["Oil India Ltd", "₹18,000", "+103.42%"],
            ["Power Grid Corp. of India", "₹9,500", "+43.89%"],
            ["MMTC Ltd", "₹6,200", "+22.51%"],
            ["Gujarat State Fert. & Chem.", "₹2,100", "+11.22%"],
            ["Hindustan Oil Exploration", "-₹540", "-2.37%"],
          ].map(([name, returnMoney, returnPercent]) => (
            <li
              key={name}
              className="flex items-center justify-between px-5 py-4 text-sm"
            >
              <span className="font-medium text-gray-800">{name}</span>
              <span
                className={
                  returnPercent.startsWith("-")
                    ? "text-right font-semibold text-red-500"
                    : "text-right font-semibold text-green-600"
                }
              >
                {returnMoney} <br />
                <span className="text-xs font-normal">{returnPercent}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Exit Basket button */}
      <div className="pt-4">
        <button className="w-full rounded-lg bg-red-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-red-700">
          Exit Basket
        </button>
      </div>
    </motion.div>
  );
}
