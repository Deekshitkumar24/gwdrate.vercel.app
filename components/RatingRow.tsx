"use client";

import React from "react";
import { Check, Lock } from "lucide-react";

interface TargetTeam {
  id: string;
  code: string;
  name: string;
  leaderName?: string;
}

interface RatingRowProps {
  team: TargetTeam;
  currentScore?: number;
  canGiveTen: boolean;
  onSelectScore: (score: number) => void;
  disabled?: boolean;
}

export default function RatingRow({
  team,
  currentScore,
  canGiveTen,
  onSelectScore,
  disabled = false,
}: RatingRowProps) {
  const isRated = typeof currentScore === "number" && currentScore >= 1 && currentScore <= 10;

  return (
    <div
      className={`group relative p-4 sm:p-5 rounded-2xl border transition-all duration-200 ${
        isRated
          ? "bg-black/60 border-white/15 shadow-lg shadow-black/40 hover:border-red-500/30"
          : "bg-black/40 border-white/5 hover:border-white/10"
      }`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
        {/* Team Identity */}
        <div className="flex items-start sm:items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-xs shrink-0 transition-colors ${
              isRated
                ? "bg-red-600/30 border border-red-500/50 text-red-200"
                : "bg-white/5 border border-white/10 text-neutral-400"
            }`}
          >
            {isRated ? <Check className="w-4 h-4 text-emerald-400" /> : team.code}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base sm:text-lg text-white group-hover:text-red-300 transition-colors">
                {team.name}
              </h3>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-white/5 text-neutral-400 border border-white/10">
                {team.code}
              </span>
            </div>
            {team.leaderName && (
              <p className="text-xs text-neutral-400 mt-0.5">
                Lead: <span className="text-neutral-300">{team.leaderName}</span>
              </p>
            )}
          </div>
        </div>

        {/* 1 - 10 Rating Button Group */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap sm:flex-nowrap">
          {Array.from({ length: 10 }).map((_, i) => {
            const scoreVal = i + 1;
            const isSelected = currentScore === scoreVal;
            const isTen = scoreVal === 10;
            const isTenDisabled = isTen && !isSelected && !canGiveTen;

            return (
              <button
                key={scoreVal}
                type="button"
                disabled={disabled || isTenDisabled}
                onClick={() => onSelectScore(scoreVal)}
                title={
                  isTenDisabled
                    ? "Maximum 5 tens used. Change an existing 10 to give this team a 10."
                    : `Rate ${scoreVal}/10`
                }
                className={`relative min-w-[32px] sm:min-w-[36px] h-9 sm:h-10 px-2 sm:px-2.5 rounded-xl font-mono text-xs sm:text-sm font-bold transition-all duration-150 flex items-center justify-center select-none active:scale-95 ${
                  isSelected
                    ? isTen
                      ? "bg-amber-500 text-black shadow-lg shadow-amber-500/40 ring-2 ring-amber-400 ring-offset-2 ring-offset-black scale-105"
                      : "bg-red-600 text-white shadow-lg shadow-red-600/40 ring-2 ring-red-500 ring-offset-2 ring-offset-black scale-105"
                    : isTenDisabled
                    ? "bg-neutral-900/60 text-neutral-600 border border-neutral-800/80 cursor-not-allowed opacity-50"
                    : isTen
                    ? "bg-amber-950/20 text-amber-300 border border-amber-600/30 hover:bg-amber-900/40 hover:border-amber-500/60"
                    : "bg-white/5 text-neutral-300 border border-white/10 hover:bg-white/10 hover:border-white/20 hover:text-white"
                }`}
              >
                {scoreVal}
                {isTenDisabled && (
                  <Lock className="w-2.5 h-2.5 text-neutral-600 absolute top-1 right-1" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
