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
        <div
          className="h-14 w-14 animate-spin rounded-full border-4 border-neutral-900 border-t-transparent shadow-lg"
          style={{
            background: "none",
            boxShadow:
              "0 2px 12px 0 rgba(0,0,0,0.10), 0 1.5px 4px 0 rgba(0,0,0,0.08)",
          }}
        />
      </div>
    );

  return isAuthenticated ? children : null;
}
