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
 * Directional slide variants — mimics native iOS navigation.
 *
 * direction > 0  (PUSH — forward):
 *   Enter: slides in from the RIGHT  (x: 100% → 0)
 *   Exit:  slides out to the LEFT    (x: 0 → -24%)
 *
 * direction < 0  (POP — back):
 *   Enter: slides in from the LEFT   (x: -100% → 0)
 *   Exit:  slides out to the RIGHT   (x: 0 → 24%)
 *
 * The slight parallax on exit (24% vs 100% travel) mirrors iOS depth cue.
 */
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? "100%" : "-100%",
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? "-24%" : "24%",
    opacity: 0,
  }),
};

/** Spring tuned for ~280ms total — matching iOS UINavigationController timing. */
const iosSpring = {
  type: "spring" as const,
  stiffness: 420,
  damping: 38,
  mass: 0.75,
};

const AnimatedLayout = () => {
  const location = useLocation();
  const navigationType = useNavigationType();

  // POP = back/forward browser navigation → enter from left
  // PUSH or REPLACE = programmatic navigate / link click → enter from right
  const direction = navigationType === "POP" ? -1 : 1;

  let path = "/";
  if (location.pathname !== "/") {
    const seg = location.pathname.split("/")[1];
    path = seg ? `/${seg}` : location.pathname;
  }
  const Page = routeMap[path as keyof typeof routeMap] ?? Dashboard;

  return (
    /**
     * overflow: hidden clips the off-screen page during the slide.
     * mode="wait" ensures exit fully completes before enter begins —
     * this prevents both pages being in the DOM simultaneously
     * (which would cause double-height layout flash).
     */
    <div
      className="relative w-full overflow-hidden"
      style={{ minHeight: "100dvh" }}
    >
      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div
          key={location.key}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={iosSpring}
          style={{ width: "100%" }}
        >
          <Page />
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default AnimatedLayout;
