import { useSupabaseAuthListener } from "@/hooks/useSupabaseAuthListener";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { queryClient, router } from "./main";

export function Providers() {
  useSupabaseAuthListener();
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>
  );
}
