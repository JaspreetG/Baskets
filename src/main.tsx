import "./index.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import { StrictMode } from "react";
import { registerSW } from "virtual:pwa-register";

import App from "./App";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import SearchBasket from "@/pages/SearchBasket";
import InvestBasket from "@/pages/InvestBasket";
import Basket from "./pages/Basket";
import { Toaster } from "@/components/ui/sonner";
import { useSupabaseAuthListener } from "@/hooks/useSupabaseAuthListener";

export const queryClient = new QueryClient();

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "login", element: <Auth /> },
      { path: "basket", element: <Basket /> },
      { path: "search", element: <SearchBasket /> },
      { path: "invest", element: <InvestBasket /> },
    ],
  },
]);

registerSW({ immediate: true });

function Providers() {
  useSupabaseAuthListener();
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Providers />
  </StrictMode>,
);
