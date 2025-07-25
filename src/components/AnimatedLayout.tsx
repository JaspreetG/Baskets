import { useLocation } from "react-router-dom";
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

const AnimatedLayout = () => {
  const location = useLocation();
  let path = "/";
  if (location.pathname !== "/") {
    const seg = location.pathname.split("/")[1];
    path = seg ? `/${seg}` : location.pathname;
  }
  const Page = routeMap[path as keyof typeof routeMap] || Dashboard;

  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        minHeight: "100vh",
        overflow: "hidden",
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.key}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14, ease: "easeInOut" }}
          style={{
            width: "100%",
            height: "100%",
            position: "absolute",
            top: 0,
            left: 0,
          }}
        >
          <Page />
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default AnimatedLayout;
