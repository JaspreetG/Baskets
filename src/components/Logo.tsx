import React from "react";

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = "h-8 w-8" }) => {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2563EB" /> {/* blue-600 */}
          <stop offset="100%" stopColor="#4F46E5" /> {/* indigo-600 */}
        </linearGradient>
        <linearGradient id="barGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Main App Icon Squircle Base */}
      <rect width="120" height="120" rx="30" fill="url(#bgGrad)" />

      {/* Abstract overlapping collection of stocks/money bars */}
      <rect x="25" y="65" width="16" height="30" rx="5" fill="white" fillOpacity="0.9" />
      <rect x="52" y="48" width="16" height="47" rx="5" fill="white" fillOpacity="0.95" />
      <rect x="79" y="28" width="16" height="67" rx="5" fill="url(#barGrad2)" filter="url(#glow)" />

      {/* Upward trend swoosh overlapping */}
      <path
        d="M 21 76 Q 40 42 86 21"
        stroke="white"
        strokeWidth="7"
        strokeLinecap="round"
        fill="none"
        strokeOpacity="0.9"
      />
      {/* Arrow Head */}
      <path
        d="M 72 20 L 89 18 L 86 35"
        stroke="white"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        strokeOpacity="0.9"
      />
    </svg>
  );
};
