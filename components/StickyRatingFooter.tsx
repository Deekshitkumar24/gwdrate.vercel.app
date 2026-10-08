"use client";

import React from "react";
import { CheckCircle2, ArrowRight, Sparkles, CloudCheck, Loader2 } from "lucide-react";

interface StickyRatingFooterProps {
  ratedCount: number;
  totalRequired: number;
  tensUsed: number;
  maxTens: number;
  savingStatus: "saved" | "saving" | "error";
  lastSavedTime?: string | null;
  onOpenReview: () => void;
  isSubmitted?: boolean;
}

export default function StickyRatingFooter({
  ratedCount,
  totalRequired,
  tensUsed,
  maxTens,
  savingStatus,
  lastSavedTime,
  onOpenReview,
  isSubmitted = false,
}: StickyRatingFooterProps) {
  const isComplete = totalRequired > 0 && ratedCount === totalRequired;
  const percentage = totalRequired > 0 ? Math.round((ratedCount / totalRequired) * 100) : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 backdrop-blur-xl bg-black/85 border-t border-white/15 shadow-2xl shadow-black/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Progress & 10s Stats */}
        <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto justify-between sm:justify-start">
          {/* Rated progress */}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                Progress:
              </span>
              <span className="font-mono text-sm font-bold text-white">
                {ratedCount} of {totalRequired} rated
              </span>
              <span className="text-xs font-mono font-medium text-neutral-400">
                ({percentage}%)
              </span>
            </div>

            {/* Micro progress bar */}
            <div className="w-32 sm:w-44 h-1.5 bg-white/10 rounded-full mt-1 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  isComplete ? "bg-emerald-400" : "bg-red-500"
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          {/* 10s counter badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-mono font-semibold text-neutral-300">
              10s: <span className="text-white font-bold">{tensUsed}</span>/{maxTens}
            </span>
          </div>

          {/* Autosave status indicator */}
          <div className="hidden md:flex items-center gap-1.5 text-xs text-neutral-400">
            {savingStatus === "saving" ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" />
                <span>Saving draft...</span>
              </>
            ) : savingStatus === "saved" ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  Draft saved{lastSavedTime ? ` (${lastSavedTime})` : ""}
                </span>
              </>
            ) : (
              <span className="text-amber-400">Offline / changes queued</span>
            )}
          </div>
        </div>

        {/* Submit / Review CTA */}
        <div className="w-full sm:w-auto flex items-center gap-2">
          {isSubmitted ? (
            <div className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-sm font-semibold flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Submission Locked & Final
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenReview}
              disabled={!isComplete}
              className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 shadow-lg ${
                isComplete
                  ? "bg-red-600 hover:bg-red-500 text-white shadow-red-900/50 hover:shadow-red-600/40 cursor-pointer active:scale-98"
                  : "bg-white/5 text-neutral-500 border border-white/5 cursor-not-allowed"
              }`}
            >
              <span>{isComplete ? "Review & Submit" : `Rate all ${totalRequired} teams to submit`}</span>
              {isComplete && <ArrowRight className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
