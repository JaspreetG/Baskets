import "./index.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";

import App from "./App";
import RequireAuth from "@/components/RequireAuth";
import Auth from "@/pages/Auth";
import { Toaster } from "@/components/ui/sonner";
import { useSupabaseAuthListener } from "@/hooks/useSupabaseAuthListener";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <Auth />,
  },
  {
    path: "/*",
    element: (
      <RequireAuth>
        <App />
      </RequireAuth>
    ),
  },
]);

const queryClient = new QueryClient();
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

createRoot(document.getElementById("root")!).render(<Providers />);
