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
        <svg
          width="44"
          height="44"
          viewBox="0 0 44 44"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            display: "inline-block",
            filter: "drop-shadow(0 2px 12px rgba(99,102,241,0.08))",
            animation: "jira-spin 2.2s linear infinite",
          }}
        >
          <defs>
            <linearGradient
              id="jira-gradient"
              x1="0"
              y1="0"
              x2="44"
              y2="44"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#2563eb" />
              <stop offset="0.5" stopColor="#6366f1" />
              <stop offset="1" stopColor="#2563eb" />
            </linearGradient>
          </defs>
          <path
            d="M22 8
            a14 14 0 0 1 0 28
            a14 14 0 0 1 0 -28"
            stroke="url(#jira-gradient)"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
            style={{
              strokeDasharray: "90 110",
              strokeDashoffset: 0,
              animation: "jira-dash 1.2s linear infinite",
            }}
          />
        </svg>
        <style>{`
        @keyframes jira-spin {
          100% { transform: rotate(360deg); }
        }
        @keyframes jira-dash {
          0% {
            stroke-dasharray: 70 130;
            stroke-dashoffset: 0;
          }
          50% {
            stroke-dasharray: 110 90;
            stroke-dashoffset: -100;
          }
          100% {
            stroke-dasharray: 70 130;
            stroke-dashoffset: -200;
          }
        }
      `}</style>
      </div>
    );

  return isAuthenticated ? children : null;
}
