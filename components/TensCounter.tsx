"use client";

import React from "react";
import { Sparkles, AlertCircle } from "lucide-react";

interface TensCounterProps {
  used: number;
  max: number;
  className?: string;
}

export default function TensCounter({ used, max, className = "" }: TensCounterProps) {
  const isMaxed = used >= max;

  return (
    <div
      className={`relative flex items-center gap-3 px-3.5 py-2 rounded-xl backdrop-blur-md border transition-all ${
        isMaxed
          ? "bg-amber-950/40 border-amber-600/50 text-amber-200"
          : "bg-black/40 border-white/10 text-neutral-200"
      } ${className}`}
    >
      <div className="flex items-center gap-1.5">
        <Sparkles
          className={`w-4 h-4 ${isMaxed ? "text-amber-400" : "text-red-400"}`}
        />
        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
          10s Used:
        </span>
      </div>

      <div className="flex items-center gap-1">
        {Array.from({ length: max }).map((_, i) => {
          const isFilled = i < used;
          return (
            <span
              key={i}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                isFilled
                  ? isMaxed
                    ? "bg-amber-400 shadow-sm shadow-amber-400/50 scale-110"
                    : "bg-red-500 shadow-sm shadow-red-500/50 scale-110"
                  : "bg-white/10 border border-white/20"
              }`}
            />
          );
        })}
      </div>

      <span className="font-mono text-sm font-bold text-white ml-0.5">
        {used} / {max}
      </span>

      {isMaxed && (
        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-amber-400/90 font-medium ml-1">
          <AlertCircle className="w-3 h-3" />
          Cap reached
        </span>
      )}
    </div>
  );
}
