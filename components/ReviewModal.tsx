"use client";

import React, { useState } from "react";
import { AlertTriangle, CheckCircle, ArrowLeft, Send, Sparkles, Loader2 } from "lucide-react";
import { RatingItem } from "@/lib/rules";

interface TargetTeam {
  id: string;
  code: string;
  name: string;
}

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitFinal: () => Promise<void>;
  targets: TargetTeam[];
  ratings: Record<string, number>;
  tensUsed: number;
  maxTens: number;
}

export default function ReviewModal({
  isOpen,
  onClose,
  onSubmitFinal,
  targets,
  ratings,
  tensUsed,
  maxTens,
}: ReviewModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const totalRequired = targets.length;
  const ratedCount = Object.keys(ratings).length;
  const isComplete = totalRequired > 0 && ratedCount === totalRequired;

  // Group ratings by score for clear breakdown
  const groupedByScore: Record<number, TargetTeam[]> = {};
  for (let s = 10; s >= 1; s--) {
    groupedByScore[s] = [];
  }
  for (const team of targets) {
    const score = ratings[team.id];
    if (score && groupedByScore[score]) {
      groupedByScore[score].push(team);
    }
  }

  const handleConfirmSubmit = async () => {
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await onSubmitFinal();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to submit ratings. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-neutral-950 border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-red-950/40 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="pb-4 border-b border-white/10">
          <div className="flex items-center gap-2 text-red-400 font-semibold text-xs uppercase tracking-wider">
            <CheckCircle className="w-4 h-4" />
            Final Verification Step
          </div>
          <h2 className="text-2xl font-bold text-white mt-1">Review Your Ratings</h2>
          <p className="text-sm text-neutral-400 mt-1">
            Please review your assigned ratings below before finalizing.
          </p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-3 gap-3 my-4">
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase">
              Teams Rated
            </span>
            <div className="font-mono text-xl font-bold text-white mt-0.5">
              {ratedCount} / {totalRequired}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase">
              10s Awarded
            </span>
            <div className="font-mono text-xl font-bold text-amber-400 mt-0.5 flex items-center justify-center gap-1">
              <Sparkles className="w-4 h-4" />
              {tensUsed} / {maxTens}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase">
              Status
            </span>
            <div className="font-mono text-xl font-bold text-emerald-400 mt-0.5">
              Ready
            </div>
          </div>
        </div>

        {/* Scrollable Summary List */}
        <div className="flex-1 overflow-y-auto pr-1 my-2 space-y-3">
          {Object.entries(groupedByScore)
            .sort(([a], [b]) => Number(b) - Number(a))
            .map(([scoreStr, teamsList]) => {
              const score = Number(scoreStr);
              if (teamsList.length === 0) return null;
              return (
                <div
                  key={score}
                  className="p-3.5 rounded-xl bg-white/5 border border-white/10"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`font-mono font-bold text-xs px-2.5 py-0.5 rounded-md ${
                        score === 10
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          : "bg-red-500/20 text-red-300 border border-red-500/40"
                      }`}
                    >
                      Score: {score} / 10
                    </span>
                    <span className="text-xs text-neutral-400">
                      {teamsList.length} {teamsList.length === 1 ? "team" : "teams"}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {teamsList.map((t) => (
                      <span
                        key={t.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/60 border border-white/10 text-xs text-neutral-200"
                      >
                        <span className="font-mono font-semibold text-red-400 text-[10px]">
                          {t.code}
                        </span>
                        <span>{t.name}</span>
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
        </div>

        {/* Final Lock Warning Notice */}
        <div className="p-3.5 my-3 rounded-xl bg-amber-950/30 border border-amber-600/40 text-amber-200 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Important Notice: </span>
            Once submitted, your ratings are permanently locked and cannot be edited.
            Ratings are collected automatically and immediately factored into the live leaderboard.
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 my-2 rounded-xl bg-red-950/60 border border-red-700 text-red-300 text-xs font-medium">
            {errorMessage}
          </div>
        )}

        {/* Actions */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-white/15 text-neutral-300 hover:text-white hover:bg-white/5 text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back & Edit
          </button>

          <button
            type="button"
            disabled={submitting || !isComplete}
            onClick={handleConfirmSubmit}
            className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white text-sm font-bold flex items-center gap-2 shadow-lg shadow-red-900/40 transition-all cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Submitting Final...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Submit Final Ratings</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
