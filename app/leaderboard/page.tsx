"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import LeaderboardTable from "@/components/LeaderboardTable";
import GwdLogo from "@/components/GwdLogo";
import {
  Trophy,
  Maximize2,
  Minimize2,
  RefreshCw,
  EyeOff,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  Clock,
  Loader2,
} from "lucide-react";
import { LeaderboardEntry } from "@/lib/rules";

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [eventData, setEventData] = useState<any>(null);
  const [progress, setProgress] = useState<any>(null);
  const [visible, setVisible] = useState(true);
  const [hiddenPreview, setHiddenPreview] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [projectorMode, setProjectorMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const fetchLeaderboard = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      // 1. Fetch current user if any
      const meRes = await fetch("/api/auth/me");
      if (meRes.ok) {
        const meData = await meRes.json();
        if (meData.authenticated) {
          setCurrentUser(meData.user);
        }
      }

      // 2. Fetch leaderboard
      const res = await fetch("/api/leaderboard");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to load leaderboard.");
      }

      setVisible(data.visible);
      setHiddenPreview(Boolean(data.hiddenPreview));
      setEventData(data.event);
      setProgress(data.progress);

      if (data.visible) {
        setLeaderboard(data.leaderboard || []);
      } else {
        setMessage(data.message);
      }

      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err: any) {
      console.error("Leaderboard fetch error:", err);
    } finally {
      setLoading(false);
      if (isManual) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
    // 5-second polling interval per FR-L3
    const interval = setInterval(() => {
      fetchLeaderboard();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  const totalActive = progress?.totalActive || 0;
  const submittedCount = progress?.submittedCount || 0;
  const isFinal = totalActive > 0 && submittedCount === totalActive;
  const isClosed = eventData?.status === "CLOSED";

  return (
    <div
      className={`min-h-screen bg-transparent text-white flex flex-col relative selection:bg-red-600 selection:text-white ${
        projectorMode ? "p-6 sm:p-10" : ""
      }`}
    >
      {!projectorMode && (
        <Navbar
          currentUser={currentUser}
          eventStatus={eventData?.status as any}
        />
      )}

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20">
        {/* Projector Header / Regular Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <GwdLogo size={projectorMode ? "md" : "sm"} showSubtitle={false} />
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border flex items-center gap-1.5 ${
                    isClosed
                      ? "bg-red-950/70 border-red-700/60 text-red-300"
                      : isFinal
                      ? "bg-emerald-950/70 border-emerald-600/60 text-emerald-300"
                      : "bg-amber-950/70 border-amber-600/60 text-amber-300"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                  {isClosed
                    ? "Voting Closed — Official Results"
                    : isFinal
                    ? "Final Leaderboard"
                    : "Live Leaderboard"}
                </span>

                {hiddenPreview && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-950/80 border border-purple-600/60 text-purple-300 flex items-center gap-1">
                    <EyeOff className="w-3.5 h-3.5" />
                    Hidden Preview (Admin Only)
                  </span>
                )}
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white mt-2">
              {eventData?.name || "Live Competition Leaderboard"}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1">
              Authoritative ranking calculated from all final submitted evaluations. Ties resolved by top-rating frequency.
            </p>
          </div>

          {/* Controls: Projector Toggle, Refresh */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              onClick={() => fetchLeaderboard(true)}
              disabled={isRefreshing}
              className="p-2.5 rounded-xl bg-black/50 border border-white/10 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
              title="Refresh now"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? "animate-spin text-red-400" : ""}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => setProjectorMode(!projectorMode)}
              className={`px-3 py-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-2 text-xs sm:text-sm font-bold ${
                projectorMode
                  ? "bg-red-600 text-white border-red-500 shadow-lg shadow-red-900/50"
                  : "bg-black/50 text-neutral-300 border-white/10 hover:bg-white/10 hover:text-white"
              }`}
            >
              {projectorMode ? (
                <>
                  <Minimize2 className="w-4 h-4" />
                  <span>Exit Stage Mode</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4" />
                  <span>Projector / Stage View</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Dynamic Event Submission Progress Banner */}
        <div className="backdrop-blur-xl bg-black/60 border border-white/10 rounded-2xl p-4 sm:p-5 mb-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 text-red-300 flex items-center justify-center font-bold">
                <Trophy className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                  <span>Voting Progress:</span>
                  <span className="font-mono text-amber-300">
                    {submittedCount} of {totalActive} teams submitted
                  </span>
                  <span className="text-xs font-mono text-neutral-400">
                    ({progress?.percentage || 0}%)
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {isFinal
                    ? "100% of participating teams have submitted their final votes."
                    : `${totalActive - submittedCount} participating teams remaining.`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-neutral-500 self-end sm:self-auto">
              <Clock className="w-3.5 h-3.5" />
              <span>Live sync • Updated {lastUpdated}</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 bg-white/10 rounded-full mt-3 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                isFinal ? "bg-emerald-400" : "bg-red-500"
              }`}
              style={{ width: `${progress?.percentage || 0}%` }}
            />
          </div>
        </div>

        {/* Hidden Leaderboard Notice */}
        {!visible ? (
          <div className="p-10 sm:p-14 rounded-3xl bg-black/70 border border-white/10 backdrop-blur-xl text-center max-w-xl mx-auto my-12 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-purple-950/50 border border-purple-600/40 text-purple-300 flex items-center justify-center mx-auto mb-4">
              <EyeOff className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-white">Leaderboard Hidden</h2>
            <p className="text-sm text-neutral-300 mt-2 leading-relaxed">
              {message || "The event organizer has temporarily hidden the live leaderboard for the grand reveal."}
            </p>
            <p className="text-xs text-neutral-500 mt-4 font-mono">
              All ratings are still being tracked accurately in real time.
            </p>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-red-500" />
            <p className="text-sm text-neutral-400">Compiling authoritative scores...</p>
          </div>
        ) : (
          <LeaderboardTable
            entries={leaderboard}
            projectorMode={projectorMode}
          />
        )}
      </main>
    </div>
  );
}
