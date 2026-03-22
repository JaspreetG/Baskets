import React from "react";

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = "h-8 w-8" }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* 
        Google Material Color Palette:
        Blue: #4285F4
        Green: #34A853
        Yellow: #FBBC05
        Red: #EA4335 
      */}
      
      {/* Background container: soft gray/white squircle or just transparent. Going fully transparent for clean UI integration */}
      
      {/* Geometric 'Basket' / 'Growth' Chart */}
      <rect x="20" y="55" width="16" height="25" rx="6" fill="#4285F4" />
      <rect x="42" y="38" width="16" height="42" rx="6" fill="#FBBC05" />
      <rect x="64" y="20" width="16" height="60" rx="6" fill="#34A853" />

      {/* Accenting Red upward dot / trend cap */}
      <circle cx="72" cy="20" r="10" fill="#EA4335" />
    </svg>
  );
};
