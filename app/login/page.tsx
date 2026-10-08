"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import GwdLogo from "@/components/GwdLogo";
import { Lock, User, Shield, ArrowRight, Loader2, KeyRound } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"team" | "admin">("team");
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload =
        tab === "team"
          ? { type: "team", code: code.trim(), password }
          : { type: "admin", email: email.trim(), password };

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || "Authentication failed.");
      }

      if (tab === "team") {
        router.push("/rate");
      } else {
        router.push("/admin");
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to log in.");
      setLoading(false);
    }
  };

  const handleQuickLogin = (role: "team" | "admin", demoCode?: string) => {
    setTab(role);
    if (role === "team") {
      setCode(demoCode || "T001");
      setPassword("password123");
    } else {
      setEmail("admin@gwd.com");
      setPassword("admin1234");
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 relative selection:bg-red-600 selection:text-white">
      <main className="w-full max-w-md z-10 animate-in fade-in duration-300">
        <div className="backdrop-blur-xl bg-black/75 border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-red-950/40">
          {/* Logo Header */}
          <div className="text-center mb-6">
            <GwdLogo size="lg" className="mx-auto mb-3" />
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Team Rating Platform
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1">
              Live peer evaluation & authoritative scoring
            </p>
          </div>

          {/* Role Tabs */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-white/5 rounded-xl border border-white/10 mb-6">
            <button
              type="button"
              onClick={() => {
                setTab("team");
                setError(null);
              }}
              className={`py-2 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                tab === "team"
                  ? "bg-red-600 text-white shadow-md shadow-red-900/40"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <User className="w-4 h-4" />
              Team Login
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("admin");
                setError(null);
              }}
              className={`py-2 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                tab === "admin"
                  ? "bg-red-600 text-white shadow-md shadow-red-900/40"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Shield className="w-4 h-4" />
              Admin Login
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-950/70 border border-red-600/50 text-red-200 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === "team" ? (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                  Team Code (e.g. T001)
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="T001"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/15 focus:border-red-500 focus:ring-1 focus:ring-red-500 text-white text-sm font-mono tracking-wider placeholder:text-neutral-600 transition-colors"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                  Admin Email
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@gwd.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/15 focus:border-red-500 focus:ring-1 focus:ring-red-500 text-white text-sm placeholder:text-neutral-600 transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/15 focus:border-red-500 focus:ring-1 focus:ring-red-500 text-white text-sm placeholder:text-neutral-600 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 active:scale-98 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-900/40 transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Logins for Instant Testing */}
          <div className="mt-6 pt-5 border-t border-white/10">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-400 text-center mb-2.5">
              1-Click Demo Evaluation Credentials
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin("team", "T001")}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-neutral-300 font-medium text-center transition-colors cursor-pointer"
              >
                Team Phoenix <span className="font-mono text-red-400">(T001)</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin("admin")}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-neutral-300 font-medium text-center transition-colors cursor-pointer"
              >
                Admin <span className="font-mono text-red-400">(Organizer)</span>
              </button>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="mt-4 flex items-center justify-between text-xs text-neutral-400 pt-2">
            <Link
              href="/register"
              className="hover:text-red-300 transition-colors"
            >
              Register Team
            </Link>
            <Link
              href="/leaderboard"
              className="hover:text-red-300 transition-colors"
            >
              View Public Leaderboard
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
