import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/auth";

export default function RequireAuth({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const loading = useAuthStore((s) => s.loading);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated && location.pathname !== "/login") {
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, loading, navigate, location]);

  if (loading)
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-green-500" />
      </div>
    );

  return isAuthenticated ? children : null;
}
