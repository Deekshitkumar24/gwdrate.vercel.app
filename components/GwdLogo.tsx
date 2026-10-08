import React from "react";
import Image from "next/image";

interface GwdLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showSubtitle?: boolean;
  useImage?: boolean;
}

export default function GwdLogo({
  className = "",
  size = "md",
  showSubtitle = true,
  useImage = false,
}: GwdLogoProps) {
  const heightMap = {
    sm: 36,
    md: 48,
    lg: 64,
    xl: 84,
  };

  const h = heightMap[size];

  if (useImage) {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        <Image
          src="/logos/gwd-get-work-done.png"
          alt="GWD - Get Work Done"
          width={h * 2.2}
          height={h}
          className="object-contain"
          priority
        />
      </div>
    );
  }

  // Razor-sharp SVG recreation of the official GWD logo
  return (
    <div className={`inline-flex flex-col items-center justify-center select-none ${className}`}>
      <svg
        viewBox="0 0 200 90"
        height={h}
        className="w-auto overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Top-right corner bracket */}
        <path
          d="M 126 12 L 188 12 L 188 44"
          stroke="#C41E1E"
          strokeWidth="6.5"
          strokeLinecap="square"
        />

        {/* Bottom-left corner bracket */}
        <path
          d="M 74 62 L 12 62 L 12 30"
          stroke="#C41E1E"
          strokeWidth="6.5"
          strokeLinecap="square"
        />

        {/* GWD Brand Text */}
        <text
          x="100"
          y="54"
          textAnchor="middle"
          fill="#C41E1E"
          fontSize="46"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="0.04em"
        >
          GWD
        </text>

        {/* Subtitle: GET WORK DONE */}
        {showSubtitle && (
          <text
            x="100"
            y="82"
            textAnchor="middle"
            fill="#C41E1E"
            fontSize="11.5"
            fontWeight="800"
            fontFamily="system-ui, -apple-system, sans-serif"
            letterSpacing="0.22em"
          >
            GET WORK DONE
          </text>
        )}
      </svg>
    </div>
  );
}
