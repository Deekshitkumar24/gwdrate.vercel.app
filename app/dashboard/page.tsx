"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import GwdLogo from "@/components/GwdLogo";
import {
  Users,
  Award,
  Trophy,
  MessageSquare,
  Clock,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  Edit3,
  Building,
  Mail,
  Phone,
  FileText,
  Loader2,
  Sparkles,
  Lock,
  Megaphone,
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [teamData, setTeamData] = useState<any>(null);
  const [eventData, setEventData] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal for editing registration when changes are requested
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editInstitution, setEditInstitution] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editContact, setEditContact] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    try {
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) {
        router.push("/login");
        return;
      }
      const meData = await meRes.json();
      if (!meData.authenticated) {
        router.push("/login");
        return;
      }
      if (meData.user.role === "admin") {
        router.push("/admin");
        return;
      }

      setCurrentUser(meData.user);

      // Fetch team detailed profile
      const teamRes = await fetch("/api/teams/me");
      if (teamRes.ok) {
        const tData = await teamRes.json();
        setTeamData(tData.team);
        setEventData(tData.event);
        setEditName(tData.team.name || "");
        setEditInstitution(tData.team.institution || "");
        setEditDescription(tData.team.description || "");
        setEditContact(tData.team.contact || "");
      }

      // Fetch announcements
      const annRes = await fetch("/api/announcements");
      if (annRes.ok) {
        const aData = await annRes.json();
        setAnnouncements(aData.announcements || []);
      }
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleUpdateRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEdit(true);
    setEditError(null);

    try {
      const res = await fetch("/api/teams/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          institution: editInstitution.trim(),
          description: editDescription.trim(),
          contact: editContact.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);

      setShowEditModal(false);
      await loadDashboardData();
    } catch (err: any) {
      setEditError(err.message || "Failed to update registration.");
    } finally {
      setSavingEdit(false);
    }
  };

  const isVotingOpen =
    eventData?.status === "OPEN" || eventData?.status === "VOTING_OPEN";
  const isResultsPublished =
    eventData?.status === "RESULTS_PUBLISHED" || eventData?.is_results_published;

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent text-white flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
        <p className="text-xs text-neutral-400">Loading your team portal...</p>
      </div>
    );
  }

  const teamStatus = teamData?.status || currentUser?.status || "APPROVED";
  const isApproved = teamStatus === "APPROVED";

  return (
    <div className="min-h-screen bg-transparent text-white flex flex-col relative selection:bg-red-600 selection:text-white">
      <Navbar currentUser={currentUser} eventStatus={eventData?.status} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24">
        {/* Registration Status Alerts */}
        {teamStatus === "PENDING" && (
          <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-amber-950/70 border border-amber-600/60 text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-white">Registration Awaiting Approval</h3>
                <p className="text-xs text-neutral-300 mt-0.5">
                  Your team registration has been submitted and is currently queued for administrator review. You can manage your team roster below while waiting.
                </p>
              </div>
            </div>
            <Link
              href="/team"
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shrink-0 text-center transition-all"
            >
              Manage Team Roster
            </Link>
          </div>
        )}

        {teamStatus === "CHANGES_REQUESTED" && (
          <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-red-950/80 border border-red-500/70 text-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xl animate-in fade-in">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-white">Changes Requested by Organizer</h3>
                <p className="text-xs text-neutral-200 mt-1">
                  <strong>Note:</strong> {teamData?.changes_requested_note || "Please review and update your team details."}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowEditModal(true)}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shrink-0 flex items-center justify-center gap-1.5 shadow-lg shadow-red-900/40 transition-all cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Update Registration</span>
            </button>
          </div>
        )}

        {/* Team Hero Header */}
        <div className="backdrop-blur-xl bg-black/60 border border-white/10 rounded-3xl p-6 sm:p-8 mb-6 shadow-xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-neutral-800 text-red-400 border border-red-900/60 uppercase">
                  Team ID: {teamData?.code || currentUser?.teamCode}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                    isApproved
                      ? "bg-emerald-950/70 text-emerald-400 border border-emerald-700/60"
                      : teamStatus === "CHANGES_REQUESTED"
                      ? "bg-red-950/70 text-red-400 border border-red-700/60"
                      : "bg-amber-950/70 text-amber-400 border border-amber-700/60"
                  }`}
                >
                  {teamStatus.replace("_", " ")}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {teamData?.name || currentUser?.teamName}
              </h1>

              {teamData?.institution && (
                <div className="flex items-center gap-1.5 text-xs text-neutral-300 mt-1">
                  <Building className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{teamData.institution}</span>
                </div>
              )}

              {teamData?.description && (
                <p className="text-xs sm:text-sm text-neutral-400 mt-2 max-w-2xl leading-relaxed">
                  {teamData.description}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href="/team"
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white flex items-center gap-2 transition-colors"
              >
                <Users className="w-4 h-4 text-neutral-400" />
                <span>My Team & Roster ({teamData?.members?.length || 1})</span>
              </Link>

              <button
                onClick={() => setShowEditModal(true)}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-neutral-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Details</span>
              </button>
            </div>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Action Card: Voting / Rating Center */}
          <div className="md:col-span-2 space-y-6">
            <div className="backdrop-blur-xl bg-black/60 border border-white/10 rounded-3xl p-6 sm:p-7 shadow-xl">
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-red-950/60 border border-red-700/50 text-red-400 flex items-center justify-center">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-white">
                      Evaluation & Voting
                    </h2>
                    <p className="text-[11px] text-neutral-400">
                      Authoritative peer-rating for participating teams
                    </p>
                  </div>
                </div>

                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase ${
                    isVotingOpen
                      ? "bg-emerald-950 text-emerald-400 border border-emerald-700"
                      : "bg-neutral-800 text-neutral-400 border border-neutral-700"
                  }`}
                >
                  {isVotingOpen ? "Live Round" : "Voting Standby"}
                </span>
              </div>

              {!isApproved ? (
                /* Unapproved team notice */
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10 text-center space-y-2">
                  <Lock className="w-6 h-6 text-neutral-500 mx-auto" />
                  <h3 className="text-sm font-bold text-white">Voting Access Restricted</h3>
                  <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                    Voting will become accessible immediately once the event organizer reviews and approves your team registration.
                  </p>
                </div>
              ) : isVotingOpen ? (
                /* Voting is Open */
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl bg-red-950/30 border border-red-600/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-bold text-red-400 uppercase tracking-wider mb-1">
                        Round Status: Active
                      </div>
                      <h3 className="text-lg font-black text-white">
                        {currentUser?.submitted
                          ? "Your Ballot Has Been Submitted"
                          : "Rate All Eligible Participating Teams"}
                      </h3>
                      <p className="text-xs text-neutral-300 mt-1 max-w-md">
                        {currentUser?.submitted
                          ? "Your evaluations are locked and recorded. Thank you for completing your peer ratings."
                          : "Rate each eligible other team from 1 to 10. You may give a maximum of five 10-ratings."}
                      </p>
                    </div>

                    <Link
                      href="/rate"
                      className={`px-6 py-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl transition-all shrink-0 ${
                        currentUser?.submitted
                          ? "bg-white/10 hover:bg-white/15 text-white border border-white/10"
                          : "bg-red-600 hover:bg-red-500 text-white shadow-red-900/40"
                      }`}
                    >
                      {currentUser?.submitted ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>View Submitted Ballot</span>
                        </>
                      ) : (
                        <>
                          <span>Open Voting Screen</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </Link>
                  </div>
                </div>
              ) : isResultsPublished ? (
                /* Results Published */
                <div className="p-5 rounded-2xl bg-purple-950/30 border border-purple-600/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-purple-400 uppercase tracking-wider block mb-1">
                      Official Results Published
                    </span>
                    <h3 className="text-lg font-black text-white">Competition Results Are Live</h3>
                    <p className="text-xs text-neutral-300 mt-1">
                      Final scores and rankings calculated with authoritative tie-breaker resolution.
                    </p>
                  </div>
                  <Link
                    href="/leaderboard"
                    className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-900/40 transition-all shrink-0"
                  >
                    <Trophy className="w-4 h-4 text-amber-300" />
                    <span>View Leaderboard</span>
                  </Link>
                </div>
              ) : (
                /* Voting Standby */
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-white">Voting Has Not Opened Yet</h3>
                    <p className="text-xs text-neutral-400 mt-1">
                      The organizer will announce when the peer-evaluation round begins. Ensure your team details and members are up to date.
                    </p>
                  </div>
                  <Link
                    href="/updates"
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs shrink-0 transition-colors"
                  >
                    Check Announcements
                  </Link>
                </div>
              )}
            </div>

            {/* Community Teaser Card */}
            <div className="backdrop-blur-xl bg-black/60 border border-white/10 rounded-3xl p-6 sm:p-7 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-950/60 border border-blue-700/50 text-blue-400 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Private Event Community</h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Discuss with fellow approved teams, ask questions, and follow official organizer threads.
                  </p>
                </div>
              </div>
              <Link
                href="/community"
                className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shrink-0 ${
                  isApproved
                    ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/30"
                    : "bg-white/5 text-neutral-500 cursor-not-allowed pointer-events-none"
                }`}
              >
                <span>Enter Community</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Right Column: Live Announcements & Team Roster */}
          <div className="space-y-6">
            {/* Live Announcements */}
            <div className="backdrop-blur-xl bg-black/60 border border-white/10 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                <div className="flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-red-400" />
                  <h3 className="text-sm font-bold text-white">Live Updates</h3>
                </div>
                <Link
                  href="/updates"
                  className="text-[11px] font-semibold text-neutral-400 hover:text-white transition-colors"
                >
                  View All
                </Link>
              </div>

              {announcements.length === 0 ? (
                <p className="text-xs text-neutral-500 py-4 text-center">No announcements yet.</p>
              ) : (
                <div className="space-y-3">
                  {announcements.slice(0, 3).map((ann) => (
                    <div
                      key={ann.id}
                      className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1 hover:border-white/20 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">
                          {ann.type.replace("_", " ")}
                        </span>
                        <span className="text-[10px] text-neutral-500">
                          {new Date(ann.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white">{ann.title}</h4>
                      <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed">
                        {ann.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Team Roster Quick Glance */}
            <div className="backdrop-blur-xl bg-black/60 border border-white/10 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-neutral-400" />
                  <h3 className="text-sm font-bold text-white">Team Roster</h3>
                </div>
                <Link
                  href="/team"
                  className="text-[11px] font-semibold text-red-400 hover:underline"
                >
                  Manage
                </Link>
              </div>

              <div className="space-y-2">
                <div className="p-2.5 rounded-xl bg-white/5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-white block">{teamData?.leader_name}</span>
                    <span className="text-[10px] text-red-400 font-semibold">Team Leader</span>
                  </div>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    {teamData?.leader_email || teamData?.contact}
                  </span>
                </div>

                {(teamData?.members || [])
                  .filter((m: any) => !m.is_leader)
                  .map((m: any) => (
                    <div
                      key={m.id}
                      className="p-2 rounded-xl bg-white/5 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-medium text-white block">{m.name}</span>
                        <span className="text-[10px] text-neutral-400">{m.role}</span>
                      </div>
                      {m.email && (
                        <span className="text-[10px] text-neutral-500 font-mono">{m.email}</span>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Edit Registration Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-neutral-900 border border-white/15 rounded-3xl p-6 sm:p-7 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-white mb-1">Update Registration</h3>
            <p className="text-xs text-neutral-400 mb-4">
              Edit team information and resubmit for organizer review.
            </p>

            {editError && (
              <div className="p-3 mb-4 rounded-xl bg-red-950/80 border border-red-600/50 text-red-200 text-xs">
                {editError}
              </div>
            )}

            <form onSubmit={handleUpdateRegistration} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase mb-1">
                  Team Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase mb-1">
                  Institution / School
                </label>
                <input
                  type="text"
                  value={editInstitution}
                  onChange={(e) => setEditInstitution(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase mb-1">
                  Contact Handle / Phone
                </label>
                <input
                  type="text"
                  required
                  value={editContact}
                  onChange={(e) => setEditContact(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase mb-1">
                  Project Description
                </label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-xs text-white resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-neutral-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-red-900/40"
                >
                  {savingEdit && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save & Resubmit</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
