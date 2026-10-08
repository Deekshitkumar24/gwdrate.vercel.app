"use client";

import React from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import GwdLogo from "@/components/GwdLogo";
import { Trophy, LogOut, Shield, Award, CheckCircle, Clock } from "lucide-react";

interface NavbarProps {
  currentUser?: {
    role: "team" | "admin";
    teamId?: string;
    teamCode?: string;
    teamName?: string;
    email?: string;
    submitted?: boolean;
  } | null;
  eventStatus?: "DRAFT" | "REGISTRATION" | "OPEN" | "CLOSED";
}

export default function Navbar({ currentUser, eventStatus = "OPEN" }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      router.push("/login");
    }
  };

  const statusColors: Record<string, string> = {
    DRAFT: "bg-neutral-800 text-neutral-400 border-neutral-700",
    REGISTRATION: "bg-blue-950/60 text-blue-400 border-blue-800/60",
    REGISTRATION_OPEN: "bg-blue-950/60 text-blue-400 border-blue-800/60",
    REGISTRATION_CLOSED: "bg-amber-950/60 text-amber-400 border-amber-800/60",
    VOTING_READY: "bg-blue-950/60 text-blue-300 border-blue-800/60",
    OPEN: "bg-emerald-950/60 text-emerald-400 border-emerald-800/60",
    VOTING_OPEN: "bg-emerald-950/60 text-emerald-400 border-emerald-800/60",
    CLOSED: "bg-red-950/60 text-red-400 border-red-800/60",
    VOTING_CLOSED: "bg-red-950/60 text-red-400 border-red-800/60",
    RESULTS_PUBLISHED: "bg-purple-950/60 text-purple-300 border-purple-800/60",
    ARCHIVED: "bg-neutral-900 text-neutral-400 border-neutral-800",
  };

  const statusLabels: Record<string, string> = {
    DRAFT: "Draft",
    REGISTRATION: "Registration Open",
    REGISTRATION_OPEN: "Registration Open",
    REGISTRATION_CLOSED: "Registration Closed",
    VOTING_READY: "Voting Ready",
    OPEN: "Voting Open",
    VOTING_OPEN: "Voting Open",
    CLOSED: "Voting Closed",
    VOTING_CLOSED: "Voting Closed",
    RESULTS_PUBLISHED: "Results Published",
    ARCHIVED: "Archived",
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-black/65 border-b border-white/10 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Status */}
        <div className="flex items-center gap-3 sm:gap-4">
          <Link href="/" className="flex items-center gap-2 group">
            <GwdLogo size="sm" showSubtitle={false} />
            <span className="font-bold text-base sm:text-lg tracking-tight text-white group-hover:text-red-400 transition-colors">
              ProjectGuard <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-red-950/70 border border-red-800/60 text-red-400 ml-1">Event</span>
            </span>
          </Link>

          {eventStatus && (
            <span
              className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border ${statusColors[eventStatus] || statusColors.DRAFT}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              {statusLabels[eventStatus] || eventStatus}
            </span>
          )}
        </div>

        {/* Right Nav & User Action */}
        <div className="flex items-center gap-2 sm:gap-4">
          <nav className="flex items-center gap-1.5 sm:gap-2">
          {currentUser?.role === "team" && (
            <>
              <Link
                href="/dashboard"
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  pathname === "/dashboard"
                    ? "bg-red-600/30 text-red-200 border border-red-500/40"
                    : "text-neutral-300 hover:text-white hover:bg-white/5"
                }`}
              >
                <span>Dashboard</span>
              </Link>

              <Link
                href="/team"
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  pathname === "/team"
                    ? "bg-red-600/30 text-red-200 border border-red-500/40"
                    : "text-neutral-300 hover:text-white hover:bg-white/5"
                }`}
              >
                <span>My Team</span>
              </Link>

              <Link
                href="/rate"
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  pathname === "/rate"
                    ? "bg-red-600/30 text-red-200 border border-red-500/40"
                    : "text-neutral-300 hover:text-white hover:bg-white/5"
                }`}
              >
                <Award className="w-4 h-4 text-red-400" />
                <span>Voting</span>
                {currentUser.submitted && (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 ml-0.5" />
                )}
              </Link>
            </>
          )}

          {/* Community: strictly for authenticated users */}
          {currentUser && (
            <Link
              href="/community"
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                pathname === "/community"
                  ? "bg-red-600/30 text-red-200 border border-red-500/40"
                  : "text-neutral-300 hover:text-white hover:bg-white/5"
              }`}
            >
              <span>Community</span>
            </Link>
          )}

          <Link
            href="/updates"
            className={`hidden sm:flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              pathname === "/updates"
                ? "bg-red-600/30 text-red-200 border border-red-500/40"
                : "text-neutral-300 hover:text-white hover:bg-white/5"
            }`}
          >
            <span>Updates</span>
          </Link>

          <Link
            href="/leaderboard"
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              pathname === "/leaderboard"
                ? "bg-red-600/30 text-red-200 border border-red-500/40"
                : "text-neutral-300 hover:text-white hover:bg-white/5"
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Leaderboard</span>
          </Link>

          {currentUser?.role === "admin" && (
            <Link
              href="/admin"
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                pathname === "/admin"
                  ? "bg-red-600/30 text-red-200 border border-red-500/40"
                  : "text-neutral-300 hover:text-white hover:bg-white/5"
              }`}
            >
              <Shield className="w-4 h-4 text-red-400" />
              <span>Admin</span>
            </Link>
          )}
        </nav>

          {/* User badge & Logout */}
          {currentUser ? (
            <div className="flex items-center gap-2 pl-2 border-l border-white/10">
              <div className="hidden md:flex flex-col text-right">
                <span className="text-xs font-semibold text-white leading-tight">
                  {currentUser.role === "team"
                    ? currentUser.teamName || currentUser.teamCode
                    : "Event Admin"}
                </span>
                <span className="text-[10px] font-mono text-neutral-400">
                  {currentUser.role === "team"
                    ? `Code: ${currentUser.teamCode}`
                    : currentUser.email}
                </span>
              </div>
              <button
                onClick={handleLogout}
                title="Log Out"
                className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition-colors border border-transparent hover:border-red-800/40"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/30 transition-all"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
