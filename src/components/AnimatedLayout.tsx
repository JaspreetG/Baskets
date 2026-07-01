import { useLocation, useNavigationType } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Dashboard from "@/pages/Dashboard";
import SearchBasket from "@/pages/SearchBasket";
import InvestBasket from "@/pages/InvestBasket";
import Basket from "@/pages/Basket";

const routeMap = {
  "/": Dashboard,
  "/search": SearchBasket,
  "/invest": InvestBasket,
  "/basket": Basket,
};

/**
 * Snappy horizontal camera-panning track animation.
 * Pages slide 100% side-by-side with solid opacity to look like a horizontal window scroll.
 */
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? "100%" : "-100%",
  }),
  center: {
    x: "0%",
  },
  exit: (direction: number) => ({
    x: direction > 0 ? "-100%" : "100%",
  }),
};

/** Snappy spring transition tuned for high-velocity navigation */
const iosSpring = {
  type: "spring" as const,
  stiffness: 480,
  damping: 42,
  mass: 0.8,
};

const AnimatedLayout = () => {
  const location = useLocation();
  const navigationType = useNavigationType();

  // Determine direction:
  // POP indicates going back (enter from left, exit to right)
  // PUSH/REPLACE indicates going forward (enter from right, exit to left)
  const direction = navigationType === "POP" ? -1 : 1;

  let path = "/";
  if (location.pathname !== "/") {
    const seg = location.pathname.split("/")[1];
    path = seg ? `/${seg}` : location.pathname;
  }
  const Page = routeMap[path as keyof typeof routeMap] ?? Dashboard;

  return (
    <div
      className="relative w-full overflow-x-hidden"
      style={{ minHeight: "100dvh", height: "100%" }}
    >
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={location.key}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={iosSpring}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            minHeight: "100dvh",
            background: "#fbfbfd", // prevent background bleed through during transitions
          }}
        >
          <Page />
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default AnimatedLayout;
