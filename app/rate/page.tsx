"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import RatingRow from "@/components/RatingRow";
import TensCounter from "@/components/TensCounter";
import StickyRatingFooter from "@/components/StickyRatingFooter";
import ReviewModal from "@/components/ReviewModal";
import {
  Trophy,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  RefreshCw,
  Sparkles,
  Lock,
  ArrowRight,
  Loader2,
} from "lucide-react";

interface TargetTeam {
  id: string;
  code: string;
  name: string;
  leaderName?: string;
}

interface CurrentUser {
  role: "team" | "admin";
  teamId: string;
  teamCode: string;
  teamName: string;
  submitted: boolean;
  submitted_at?: string | null;
}

export default function RatePage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [eventData, setEventData] = useState<{
    id: string;
    name: string;
    status: string;
    max_tens: number;
  } | null>(null);

  const [targets, setTargets] = useState<TargetTeam[]>([]);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "unrated" | "rated">("all");

  // Autosave status
  const [savingStatus, setSavingStatus] = useState<"saved" | "saving" | "error">("saved");
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  // Review modal
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  // Submission state
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);

  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initial load: fetch target teams and current draft/final ratings
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Get targets
      const targetsRes = await fetch("/api/teams/targets");
      if (targetsRes.status === 401) {
        router.push("/login");
        return;
      }
      const targetsData = await targetsRes.json();
      if (!targetsRes.ok) {
        throw new Error(targetsData.message || targetsData.error || "Failed to load teams.");
      }

      setTargets(targetsData.targets || []);
      setEventData(targetsData.event);
      setCurrentUser({
        role: "team",
        teamId: targetsData.currentTeam.id,
        teamCode: targetsData.currentTeam.code,
        teamName: targetsData.currentTeam.name,
        submitted: targetsData.currentTeam.submitted,
        submitted_at: targetsData.currentTeam.submitted_at,
      });

      if (targetsData.currentTeam.submitted) {
        setIsSubmitted(true);
        setSubmittedAt(targetsData.currentTeam.submitted_at);
      }

      // 2. Get existing ratings (draft or final)
      const ratingsRes = await fetch("/api/ratings/me");
      if (ratingsRes.ok) {
        const ratingsData = await ratingsRes.json();
        const scoreMap: Record<string, number> = {};
        for (const item of ratingsData.ratings || []) {
          scoreMap[item.targetTeamId] = item.score;
        }
        setRatings(scoreMap);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load voting data.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Dynamic calculations: ALWAYS dynamic N - 1
  const totalRequired = targets.length;
  const maxTensConfig = eventData?.max_tens || 5;
  const maxTens = Math.min(maxTensConfig, totalRequired);

  const ratedCount = Object.keys(ratings).length;
  const tensUsed = Object.values(ratings).filter((s) => s === 10).length;
  const canGiveTen = tensUsed < maxTens;
  const isComplete = totalRequired > 0 && ratedCount === totalRequired;

  // Server draft autosave function
  const triggerAutosave = useCallback(
    async (updatedRatings: Record<string, number>) => {
      if (isSubmitted) return;
      setSavingStatus("saving");

      try {
        const payload = Object.entries(updatedRatings).map(([targetTeamId, score]) => ({
          targetTeamId,
          score,
        }));

        const res = await fetch("/api/ratings/draft", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ratings: payload }),
        });

        if (!res.ok) {
          throw new Error("Autosave failed");
        }

        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        setSavingStatus("saved");
        setLastSavedTime(timeStr);

        // Also backup in localStorage
        if (currentUser?.teamId) {
          localStorage.setItem(
            `gwd_ratings_draft_${currentUser.teamId}`,
            JSON.stringify(updatedRatings)
          );
        }
      } catch (e) {
        console.warn("Autosave temporary network issue, keeping in local memory:", e);
        setSavingStatus("error");
      }
    },
    [isSubmitted, currentUser?.teamId]
  );

  // Score selection handler
  const handleSelectScore = (targetTeamId: string, score: number) => {
    if (isSubmitted) return;

    const currentScore = ratings[targetTeamId];

    // If attempting to select 10 when 5 are already used on other teams
    if (score === 10 && currentScore !== 10 && !canGiveTen) {
      return;
    }

    const updated = {
      ...ratings,
      [targetTeamId]: score,
    };

    setRatings(updated);

    // Debounce autosave to avoid flooding during rapid clicks
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }
    autosaveTimerRef.current = setTimeout(() => {
      triggerAutosave(updated);
    }, 450);
  };

  // Submit Final Ratings
  const handleFinalSubmit = async () => {
    const payload = Object.entries(ratings).map(([targetTeamId, score]) => ({
      targetTeamId,
      score,
    }));

    const res = await fetch("/api/ratings/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ratings: payload }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || "Submission failed.");
    }

    setIsSubmitted(true);
    setSubmittedAt(new Date().toISOString());
    setIsReviewOpen(false);
  };

  // Filtered targets
  const filteredTargets = targets.filter((target) => {
    const matchesSearch =
      target.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      target.code.toLowerCase().includes(searchQuery.toLowerCase());

    const isRated = ratings[target.id] !== undefined;

    if (!matchesSearch) return false;
    if (filterType === "rated") return isRated;
    if (filterType === "unrated") return !isRated;
    return true;
  });

  return (
    <div className="min-h-screen bg-transparent text-white flex flex-col relative selection:bg-red-600 selection:text-white">
      <Navbar
        currentUser={currentUser}
        eventStatus={eventData?.status as any}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-red-500" />
            <p className="text-sm text-neutral-400">Loading participating teams & rules...</p>
          </div>
        ) : error ? (
          <div className="p-6 rounded-3xl bg-black/60 border border-red-800/60 backdrop-blur-md text-center max-w-lg mx-auto my-12">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-white mb-2">Notice</h2>
            <p className="text-sm text-neutral-300 mb-6">{error}</p>
            <button
              onClick={loadData}
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition-colors cursor-pointer"
            >
              Try Again
            </button>
          </div>
        ) : eventData?.status !== "OPEN" && eventData?.status !== "VOTING_OPEN" && !isSubmitted ? (
          /* Waiting / Event not open state */
          <div className="p-8 sm:p-12 rounded-3xl bg-black/70 border border-white/10 backdrop-blur-md text-center max-w-xl mx-auto my-12">
            <div className="w-16 h-16 rounded-2xl bg-amber-950/40 border border-amber-600/40 text-amber-400 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-white">
              {eventData?.status === "CLOSED" || eventData?.status === "VOTING_CLOSED" || eventData?.status === "RESULTS_PUBLISHED" || eventData?.status === "ARCHIVED"
                ? "Voting Has Concluded"
                : "Voting Has Not Started Yet"}
            </h2>
            <p className="text-sm text-neutral-400 mt-2 leading-relaxed">
              {eventData?.status === "CLOSED" || eventData?.status === "VOTING_CLOSED" || eventData?.status === "RESULTS_PUBLISHED" || eventData?.status === "ARCHIVED"
                ? "The organizer has closed the voting round. Final results are now being compiled."
                : "Voting has not been activated by the event administrator yet. Please wait for the official announcement to begin rating."}
            </p>
            <div className="mt-8 flex items-center justify-center gap-4">
              <Link
                href="/leaderboard"
                className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-lg shadow-red-900/40 transition-all"
              >
                View Leaderboard
              </Link>
            </div>
          </div>
        ) : isSubmitted ? (
          /* Submission Locked Confirmation Screen */
          <div className="p-8 sm:p-12 rounded-3xl bg-black/80 border border-white/15 backdrop-blur-xl text-center max-w-2xl mx-auto my-8 shadow-2xl shadow-emerald-950/20 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-20 h-20 rounded-3xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-400 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-950/50">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <span className="inline-block px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-600/50 text-emerald-300 text-xs font-semibold tracking-wider uppercase mb-2">
              Submission Finalized & Locked
            </span>
            <h1 className="text-3xl font-black text-white tracking-tight">
              Voting Complete!
            </h1>
            <p className="text-sm text-neutral-300 mt-2 max-w-md mx-auto leading-relaxed">
              Thank you, <strong className="text-white">{currentUser?.teamName}</strong>. Your ratings for all{" "}
              <strong className="text-white">{totalRequired} teams</strong> have been securely recorded and locked.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-8 text-left">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-[11px] font-semibold text-neutral-400 uppercase">
                  Teams Rated
                </span>
                <div className="font-mono text-xl font-bold text-white mt-1">
                  {totalRequired} of {totalRequired}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-[11px] font-semibold text-neutral-400 uppercase">
                  10s Awarded
                </span>
                <div className="font-mono text-xl font-bold text-amber-400 mt-1 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  {tensUsed} of {maxTens}
                </div>
              </div>

              <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-[11px] font-semibold text-neutral-400 uppercase">
                  Submitted At
                </span>
                <div className="font-mono text-xs font-semibold text-neutral-300 mt-2 truncate">
                  {submittedAt ? new Date(submittedAt).toLocaleTimeString() : "Just now"}
                </div>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/leaderboard"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-red-900/40 transition-all cursor-pointer"
              >
                <Trophy className="w-4 h-4 text-amber-300" />
                <span>Go to Live Leaderboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : totalRequired === 0 ? (
          /* Edge case: only 1 team exists in the entire event */
          <div className="p-8 rounded-3xl bg-black/60 border border-white/10 backdrop-blur-md text-center max-w-lg mx-auto my-12">
            <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-white">No Other Teams to Rate</h2>
            <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
              Your team is currently the only active approved team in this event.
              As other teams are added and approved by the organizer, they will automatically appear here for you to rate.
            </p>
          </div>
        ) : (
          /* Main Interactive Rating Journey */
          <div className="space-y-6">
            {/* Header info & dynamic progress */}
            <div className="backdrop-blur-xl bg-black/60 border border-white/10 rounded-3xl p-6 sm:p-7 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-white/10">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-red-400 uppercase tracking-wider mb-1">
                    <span>{eventData?.name}</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                    Rate Participating Teams
                  </h1>
                  <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                    Rate each team from <strong className="text-neutral-200">1 to 10</strong>.
                    You may award <strong className="text-amber-400">10</strong> to a maximum of{" "}
                    <strong className="text-amber-400">{maxTens} teams</strong>.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <TensCounter used={tensUsed} max={maxTens} />
                </div>
              </div>

              {/* Dynamic Progress and Explanation */}
              <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-neutral-400">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">
                    Progress: {ratedCount} of {totalRequired} teams rated
                  </span>
                  <span className="font-mono text-neutral-500">
                    ({Math.round((ratedCount / totalRequired) * 100)}%)
                  </span>
                </div>
                <div className="text-[11px] text-neutral-400">
                  Ratings autosave continuously as drafts until you submit.
                </div>
              </div>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search teams by name or code..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-black/40 border border-white/10 focus:border-red-500 focus:ring-1 focus:ring-red-500 text-xs sm:text-sm text-white placeholder:text-neutral-600 transition-colors"
                />
              </div>

              <div className="flex items-center gap-1.5 self-end sm:self-auto p-1 bg-black/40 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setFilterType("all")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    filterType === "all"
                      ? "bg-red-600/30 text-red-200 border border-red-500/40"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  All ({totalRequired})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType("unrated")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    filterType === "unrated"
                      ? "bg-red-600/30 text-red-200 border border-red-500/40"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  Unrated ({totalRequired - ratedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType("rated")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    filterType === "rated"
                      ? "bg-red-600/30 text-red-200 border border-red-500/40"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  Rated ({ratedCount})
                </button>
              </div>
            </div>

            {/* Team Rows List */}
            <div className="space-y-3">
              {filteredTargets.length === 0 ? (
                <div className="text-center py-12 rounded-2xl bg-black/30 border border-white/5">
                  <p className="text-sm text-neutral-400">No teams match your search or filter.</p>
                </div>
              ) : (
                filteredTargets.map((team) => (
                  <RatingRow
                    key={team.id}
                    team={team}
                    currentScore={ratings[team.id]}
                    canGiveTen={canGiveTen}
                    onSelectScore={(score) => handleSelectScore(team.id, score)}
                  />
                ))
              )}
            </div>

            {/* Sticky Submission Footer */}
            <StickyRatingFooter
              ratedCount={ratedCount}
              totalRequired={totalRequired}
              tensUsed={tensUsed}
              maxTens={maxTens}
              savingStatus={savingStatus}
              lastSavedTime={lastSavedTime}
              onOpenReview={() => setIsReviewOpen(true)}
              isSubmitted={isSubmitted}
            />

            {/* Review & Submit Modal */}
            <ReviewModal
              isOpen={isReviewOpen}
              onClose={() => setIsReviewOpen(false)}
              onSubmitFinal={handleFinalSubmit}
              targets={targets}
              ratings={ratings}
              tensUsed={tensUsed}
              maxTens={maxTens}
            />
          </div>
        )}
      </main>
    </div>
  );
}
