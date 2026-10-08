"use client";

import React from "react";
import { Trophy, Medal, Sparkles } from "lucide-react";
import { LeaderboardEntry } from "@/lib/rules";

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  projectorMode?: boolean;
}

export default function LeaderboardTable({
  entries,
  projectorMode = false,
}: LeaderboardTableProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-16 px-4 rounded-3xl bg-black/40 border border-white/10 backdrop-blur-md">
        <Trophy className="w-12 h-12 mx-auto text-neutral-600 mb-3" />
        <h3 className="text-lg font-bold text-white">No Ratings Submitted Yet</h3>
        <p className="text-sm text-neutral-400 mt-1 max-w-md mx-auto">
          No ratings submitted yet. Rankings will appear as approved teams submit their ballots.
        </p>
      </div>
    );
  }

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-400 text-black font-black text-sm shadow-lg shadow-amber-400/40">
          <Trophy className="w-4 h-4" />
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-200 text-slate-900 font-black text-sm shadow-md shadow-slate-300/30">
          <Medal className="w-4 h-4" />
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-700 text-amber-100 font-black text-sm shadow-md shadow-amber-700/30">
          <Medal className="w-4 h-4" />
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/5 border border-white/10 font-mono font-bold text-sm text-neutral-300">
        #{rank}
      </span>
    );
  };

  if (projectorMode) {
    return (
      <div className="w-full space-y-3">
        {entries.map((entry) => {
          const isTop3 = entry.rank <= 3;
          return (
            <div
              key={entry.teamId}
              className={`flex items-center justify-between p-5 sm:p-6 rounded-2xl border backdrop-blur-md transition-all ${
                entry.rank === 1
                  ? "bg-amber-950/30 border-amber-500/50 shadow-xl shadow-amber-950/40 ring-1 ring-amber-500/30"
                  : entry.rank === 2
                  ? "bg-slate-900/40 border-slate-400/30 shadow-lg"
                  : entry.rank === 3
                  ? "bg-amber-950/20 border-amber-700/30 shadow-md"
                  : "bg-black/60 border-white/10"
              }`}
            >
              <div className="flex items-center gap-5 sm:gap-6">
                <div className="text-2xl sm:text-3xl font-black">
                  {getRankBadge(entry.rank)}
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl sm:text-3xl font-black tracking-tight text-white">
                      {entry.teamName}
                    </h2>
                    <span className="font-mono text-sm sm:text-base px-2.5 py-0.5 rounded-lg bg-white/10 text-neutral-300 border border-white/10">
                      {entry.teamCode}
                    </span>
                    {entry.isTied && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-700/50">
                        Tied
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs sm:text-sm text-neutral-400 mt-1 font-mono">
                    <span>{entry.ratingsReceived} ratings received</span>
                    <span>•</span>
                    <span className="text-amber-400 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      {entry.tensReceived} tens
                    </span>
                  </div>
                </div>
              </div>

              {/* Large Score */}
              <div className="text-right">
                <div className="text-3xl sm:text-5xl font-mono font-black tracking-tight text-white flex items-baseline justify-end gap-1">
                  <span>{entry.avgScore.toFixed(2)}</span>
                  <span className="text-xs sm:text-sm text-neutral-400 font-sans font-medium">/ 10</span>
                </div>
                <div className="text-[11px] sm:text-xs text-neutral-400 uppercase font-semibold tracking-wider">
                  Average Rating
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-white/10 backdrop-blur-md bg-black/60 shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-neutral-300">
          <thead className="bg-white/5 border-b border-white/10 text-xs font-semibold uppercase tracking-wider text-neutral-400">
            <tr>
              <th scope="col" className="px-5 py-4 w-20 text-center">
                Rank
              </th>
              <th scope="col" className="px-6 py-4">
                Team
              </th>
              <th scope="col" className="px-6 py-4 text-center">
                Avg Rating
              </th>
              <th scope="col" className="px-6 py-4 text-center">
                Ratings Received
              </th>
              <th scope="col" className="px-6 py-4 text-center">
                10s Received
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {entries.map((entry) => {
              const isFirst = entry.rank === 1;
              return (
                <tr
                  key={entry.teamId}
                  className={`hover:bg-white/5 transition-colors ${
                    isFirst ? "bg-red-950/20" : ""
                  }`}
                >
                  <td className="px-5 py-4 text-center font-bold">
                    <div className="flex items-center justify-center">
                      {getRankBadge(entry.rank)}
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-base text-white">
                        {entry.teamName}
                      </span>
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-white/5 text-neutral-400 border border-white/10">
                        {entry.teamCode}
                      </span>
                      {entry.isTied && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-700/40">
                          Tied
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="px-6 py-4 text-center">
                    <span className="font-mono text-lg font-black text-white px-3 py-1 rounded-xl bg-white/5 border border-white/10 inline-block">
                      {entry.avgScore.toFixed(2)}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-center font-mono font-medium text-neutral-300">
                    {entry.ratingsReceived}
                  </td>

                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center gap-1 font-mono font-semibold text-amber-400">
                      <Sparkles className="w-3.5 h-3.5" />
                      {entry.tensReceived}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
