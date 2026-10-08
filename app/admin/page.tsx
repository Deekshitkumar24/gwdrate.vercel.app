"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import LeaderboardTable from "@/components/LeaderboardTable";
import GwdLogo from "@/components/GwdLogo";
import {
  Shield,
  Users,
  Trophy,
  FileSpreadsheet,
  History,
  CheckCircle,
  XCircle,
  Unlock,
  AlertTriangle,
  Plus,
  Upload,
  Eye,
  EyeOff,
  Snowflake,
  Play,
  Square,
  KeyRound,
  RotateCcw,
  Loader2,
  Download,
  Search,
  Settings,
  MessageSquare,
  FileText,
  HelpCircle,
  Calendar,
  ExternalLink,
  ChevronRight,
  Filter,
} from "lucide-react";
import { LeaderboardEntry } from "@/lib/rules";

const LIFECYCLE_STAGES = [
  { id: "DRAFT", label: "Draft", desc: "Initial Setup & Staging" },
  { id: "REGISTRATION_OPEN", label: "Reg Open", desc: "Teams Registering" },
  { id: "REGISTRATION_CLOSED", label: "Reg Closed", desc: "Roster Curation" },
  { id: "VOTING_READY", label: "Voting Ready", desc: "Readiness Check & Lock" },
  { id: "VOTING_OPEN", label: "Voting Open", desc: "Live Peer Scoring" },
  { id: "VOTING_CLOSED", label: "Voting Closed", desc: "Score Lock" },
  { id: "RESULTS_PUBLISHED", label: "Results Live", desc: "Public Winner Reveal" },
  { id: "ARCHIVED", label: "Archived", desc: "Historical Record" },
] as const;

export default function AdminPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [eventData, setEventData] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [progress, setProgress] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState<"monitor" | "teams" | "leaderboard" | "audit">("monitor");
  const [teamStatusFilter, setTeamStatusFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modals & Drawers
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<any | null>(null);
  const [showRequestChangesModal, setShowRequestChangesModal] = useState(false);
  const [requestChangesNote, setRequestChangesNote] = useState("");

  // Lifecycle confirmation modal state
  const [pendingStatusTransition, setPendingStatusTransition] = useState<string | null>(null);

  // Form states
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamLeader, setNewTeamLeader] = useState("");
  const [newTeamContact, setNewTeamContact] = useState("");
  const [importCsvText, setImportCsvText] = useState("");

  // Config form state
  const [configForm, setConfigForm] = useState({
    name: "",
    description: "",
    start_date: "",
    end_date: "",
    min_teams: 3,
    max_tens_allowed: 5,
    leaderboard_visibility: "MEMBERS_ONLY",
  });

  const [searchQuery, setSearchQuery] = useState("");

  const loadAdminData = useCallback(async () => {
    try {
      setLoading(true);

      // Verify admin auth
      const meRes = await fetch("/api/auth/me");
      if (meRes.status === 401) {
        router.push("/login");
        return;
      }
      const meData = await meRes.json();
      if (!meData.authenticated || meData.user.role !== "admin") {
        router.push("/login");
        return;
      }
      setCurrentUser(meData.user);

      // Fetch teams and event state
      const teamsRes = await fetch("/api/admin/teams");
      const teamsData = await teamsRes.json();
      setTeams(teamsData.teams || []);
      setEventData(teamsData.event);
      setProgress(teamsData.progress);

      if (teamsData.event) {
        setConfigForm({
          name: teamsData.event.name || "",
          description: teamsData.event.description || "",
          start_date: teamsData.event.start_date || "",
          end_date: teamsData.event.end_date || "",
          min_teams: teamsData.event.min_teams ?? 3,
          max_tens_allowed: teamsData.event.max_tens_allowed ?? 5,
          leaderboard_visibility: teamsData.event.leaderboard_visibility || "MEMBERS_ONLY",
        });
      }

      // Fetch leaderboard
      const lbRes = await fetch("/api/leaderboard");
      const lbData = await lbRes.json();
      if (lbData.leaderboard) {
        setLeaderboard(lbData.leaderboard);
      }

      // Fetch audit logs
      const auditRes = await fetch("/api/admin/audit");
      const auditData = await auditRes.json();
      setAuditLogs(auditData.logs || []);
    } catch (err: any) {
      console.error("Admin load error:", err);
      setStatusMessage({ type: "error", text: err.message || "Failed to load admin data." });
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const showFeedback = (text: string, type: "success" | "error" = "success") => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Request status change with confirmation gates
  const handleRequestStatusChange = (newStatus: string) => {
    if (
      newStatus === "VOTING_OPEN" ||
      newStatus === "VOTING_CLOSED" ||
      newStatus === "RESULTS_PUBLISHED" ||
      newStatus === "ARCHIVED"
    ) {
      setPendingStatusTransition(newStatus);
    } else {
      handleUpdateEventStatus(newStatus);
    }
  };

  // Event Status change (supports all 8 stages + legacy)
  const handleUpdateEventStatus = async (newStatus: string) => {
    setActionLoading(true);
    setPendingStatusTransition(null);
    try {
      const res = await fetch("/api/admin/event/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);
      showFeedback(`Event transitioned to ${newStatus}.`);
      await loadAdminData();
    } catch (err: any) {
      showFeedback(err.message || "Failed to update event status.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // 1-Click Reset to Clean Zero-Mock Data
  const handleResetCleanData = async () => {
    if (
      !confirm(
        "Are you sure you want to reset the event to a clean zero-mock state? All registered teams, ratings, announcements, and messages will be removed."
      )
    ) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/reset-clean", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);
      showFeedback("Database reset to clean zero-mock state.");
      await loadAdminData();
    } catch (err: any) {
      showFeedback(err.message || "Failed to reset clean database.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Event Configuration Update
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/event/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);
      showFeedback("Event configuration saved successfully.");
      setShowConfigModal(false);
      await loadAdminData();
    } catch (err: any) {
      showFeedback(err.message || "Failed to update configuration.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Freeze roster
  const handleFreezeRoster = async () => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/event/freeze-roster", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);
      showFeedback(data.message || "Roster frozen successfully!");
      await loadAdminData();
    } catch (err: any) {
      showFeedback(err.message || "Failed to freeze roster.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle Leaderboard visibility
  const handleToggleVisibility = async (visible: boolean) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/leaderboard/visibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visible }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);
      showFeedback(data.message);
      await loadAdminData();
    } catch (err: any) {
      showFeedback(err.message || "Failed to toggle visibility.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Approve team
  const handleApproveTeam = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/teams/${id}/approve`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showFeedback("Team approved successfully.");
      if (selectedTeam?.id === id) {
        setSelectedTeam({ ...selectedTeam, status: "APPROVED" });
      }
      await loadAdminData();
    } catch (err: any) {
      showFeedback(err.message || "Failed to approve team.", "error");
    }
  };

  // Reject team
  const handleRejectTeam = async (id: string) => {
    const reason = prompt("Enter rejection reason:") || "Not approved.";
    try {
      const res = await fetch(`/api/admin/teams/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showFeedback("Team registration rejected.");
      if (selectedTeam?.id === id) {
        setSelectedTeam({ ...selectedTeam, status: "REJECTED" });
      }
      await loadAdminData();
    } catch (err: any) {
      showFeedback(err.message || "Failed to reject team.", "error");
    }
  };

  // Request Changes
  const handleRequestChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam) return;
    try {
      const res = await fetch(`/api/admin/teams/${selectedTeam.id}/request-changes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: requestChangesNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showFeedback(`Changes requested from ${selectedTeam.name}.`);
      setShowRequestChangesModal(false);
      setRequestChangesNote("");
      setSelectedTeam(data.team);
      await loadAdminData();
    } catch (err: any) {
      showFeedback(err.message || "Failed to request changes.", "error");
    }
  };

  // Unlock submission
  const handleUnlockTeam = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to unlock ${name}'s submission? They will be able to edit and re-submit ratings.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/teams/${id}/unlock`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showFeedback(data.message);
      await loadAdminData();
    } catch (err: any) {
      showFeedback(err.message || "Failed to unlock submission.", "error");
    }
  };

  // Disqualify / Restore / Withdraw
  const handleDisqualifyTeam = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/teams/${id}/disqualify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showFeedback(data.message);
      if (selectedTeam?.id === id) {
        setSelectedTeam({ ...selectedTeam, status: newStatus });
      }
      await loadAdminData();
    } catch (err: any) {
      showFeedback(err.message || "Failed to update team status.", "error");
    }
  };

  // Reset password
  const handleResetPassword = async (id: string, code: string) => {
    const newPw = prompt(`Enter new password for ${code}:`, "password123");
    if (!newPw) return;
    try {
      const res = await fetch(`/api/admin/teams/${id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showFeedback(data.message);
    } catch (err: any) {
      showFeedback(err.message || "Failed to reset password.", "error");
    }
  };

  // Add team manually
  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTeamName,
          leader_name: newTeamLeader,
          contact: newTeamContact,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showFeedback(`Team ${data.team.name} (${data.team.code}) created successfully.`);
      setShowAddTeamModal(false);
      setNewTeamName("");
      setNewTeamLeader("");
      setNewTeamContact("");
      await loadAdminData();
    } catch (err: any) {
      showFeedback(err.message || "Failed to add team.", "error");
    }
  };

  // Import CSV
  const handleImportCsv = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/teams/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvContent: importCsvText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showFeedback(`Successfully imported ${data.importedCount} teams.`);
      setShowImportModal(false);
      setImportCsvText("");
      await loadAdminData();
    } catch (err: any) {
      showFeedback(err.message || "Failed to import teams.", "error");
    }
  };

  // 1-Click Reset Demo Data
  const handleResetDemoData = async () => {
    if (!confirm("Reset database to initial demo state? This will restore sample teams and test ratings.")) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/reset-demo", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showFeedback(data.message);
      await loadAdminData();
    } catch (err: any) {
      showFeedback(err.message || "Failed to reset demo data.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Export CSV
  const handleExport = (type: "leaderboard" | "matrix") => {
    window.location.href = `/api/admin/export?type=${type}`;
  };

  const filteredTeams = teams.filter((t) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      t.name.toLowerCase().includes(q) ||
      t.code.toLowerCase().includes(q) ||
      t.leader_name?.toLowerCase().includes(q) ||
      t.contact?.toLowerCase().includes(q) ||
      t.institution?.toLowerCase().includes(q);

    const matchesStatus =
      teamStatusFilter === "ALL" || t.status === teamStatusFilter;

    return matchesSearch && matchesStatus;
  });

  const currentStatus = eventData?.status || "DRAFT";

  // Map legacy status for active button check
  const isStageActive = (stageId: string) => {
    if (currentStatus === stageId) return true;
    if (stageId === "REGISTRATION_OPEN" && currentStatus === "REGISTRATION") return true;
    if (stageId === "VOTING_OPEN" && currentStatus === "OPEN") return true;
    if (stageId === "VOTING_CLOSED" && currentStatus === "CLOSED") return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-transparent text-white flex flex-col relative selection:bg-red-600 selection:text-white">
      <Navbar currentUser={currentUser} eventStatus={eventData?.status} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24">
        {/* Admin Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-red-400 uppercase tracking-wider mb-1">
              <Shield className="w-4 h-4" />
              <span>Organizer Command Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              {eventData?.name || "Event Administration"}
              <button
                onClick={() => setShowConfigModal(true)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                title="Event Configuration"
              >
                <Settings className="w-4 h-4" />
              </button>
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1">
              Manage participating roster, voting phases, live monitoring, tie inspection, and data exports.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowConfigModal(true)}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-neutral-400" />
              <span>Configure Event</span>
            </button>
            <button
              onClick={() => handleExport("leaderboard")}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Leaderboard CSV</span>
            </button>
            <button
              onClick={() => handleExport("matrix")}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Rating Matrix CSV</span>
            </button>
            <button
              onClick={handleResetCleanData}
              title="Reset Database to Clean Zero-Mock State"
              className="px-3 py-2 rounded-xl bg-white/5 hover:bg-red-950/40 border border-white/10 hover:border-red-600/40 text-xs font-semibold text-neutral-300 hover:text-red-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-neutral-400" />
              <span>Reset Clean (Zero Data)</span>
            </button>
          </div>
        </div>

        {statusMessage && (
          <div
            className={`p-3.5 rounded-2xl mb-6 text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all ${
              statusMessage.type === "success"
                ? "bg-emerald-950/70 border border-emerald-600/50 text-emerald-200"
                : "bg-red-950/70 border border-red-600/50 text-red-200"
            }`}
          >
            {statusMessage.type === "success" ? (
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Phase & Control Center Banner */}
        <div className="backdrop-blur-xl bg-black/60 border border-white/10 rounded-3xl p-6 sm:p-7 mb-6 shadow-xl">
          {/* 8-Stage Lifecycle Bar */}
          <div className="pb-6 border-b border-white/10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                Event Lifecycle Phase
              </span>
              <span className="text-xs font-mono font-bold text-red-400">
                Current: {currentStatus}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
              {LIFECYCLE_STAGES.map((st) => {
                const active = isStageActive(st.id);
                return (
                  <button
                    key={st.id}
                    onClick={() => handleRequestStatusChange(st.id)}
                    disabled={actionLoading || active}
                    className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                      active
                        ? "bg-red-600/30 border-red-500 text-white shadow-lg shadow-red-950/60"
                        : "bg-white/[0.03] hover:bg-white/[0.07] border-white/10 text-neutral-400 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[11px] font-bold ${active ? "text-white" : "text-neutral-300"}`}>
                        {st.label}
                      </span>
                      {active && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />}
                    </div>
                    <span className="text-[10px] text-neutral-500 block truncate mt-0.5">
                      {st.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Roster Lock & Visibility Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6 border-b border-white/10">
            {/* Roster Freeze Control */}
            <div className="flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                  Roster Lock (Fix Dynamic N)
                </span>
                <p className="text-xs text-neutral-500 mb-3">
                  Locks approved participants count N prior to peer voting so all teams evaluate exactly N - 1 targets.
                </p>
              </div>

              {eventData?.roster_frozen_at ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-950/40 border border-blue-600/40 text-blue-300 text-xs font-semibold">
                  <Snowflake className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>
                    Frozen at {new Date(eventData.roster_frozen_at).toLocaleTimeString()}
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleFreezeRoster}
                  disabled={actionLoading}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-950/50 transition-all cursor-pointer"
                >
                  <Snowflake className="w-4 h-4" />
                  <span>Freeze Roster Now</span>
                </button>
              )}
            </div>

            {/* Leaderboard Visibility */}
            <div className="flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                  Leaderboard Reveal Gate
                </span>
                <p className="text-xs text-neutral-500 mb-3">
                  Stage reveal protection: keep rankings sealed from teams until stage ceremony.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleVisibility(!eventData?.leaderboard_visible)}
                  disabled={actionLoading}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                    eventData?.leaderboard_visible
                      ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60"
                      : "bg-purple-950/60 border-purple-500/50 text-purple-300 hover:bg-purple-900/60"
                  }`}
                >
                  {eventData?.leaderboard_visible ? (
                    <>
                      <Eye className="w-4 h-4 text-emerald-400" />
                      <span>Visible to Participants & Public</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-4 h-4 text-purple-400" />
                      <span>Hidden (Stage Reveal Mode)</span>
                    </>
                  )}
                </button>

                <Link
                  href="/leaderboard?mode=projector"
                  target="_blank"
                  className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-neutral-300 flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Open Projector View</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Dynamic Progress Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-6">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                Total Active Teams (N)
              </span>
              <div className="font-mono text-2xl font-black text-white mt-1">
                {progress?.totalActive || 0}
              </div>
              <span className="text-[10px] text-neutral-500 mt-0.5 block">
                Each team rates N-1 targets
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                Submissions Completed
              </span>
              <div className="font-mono text-2xl font-black text-emerald-400 mt-1">
                {progress?.submittedCount || 0}
              </div>
              <span className="text-[10px] text-neutral-500 mt-0.5 block">
                Locked & included in averages
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                Submissions Pending
              </span>
              <div className="font-mono text-2xl font-black text-amber-400 mt-1">
                {progress?.remainingCount || 0}
              </div>
              <span className="text-[10px] text-neutral-500 mt-0.5 block">
                Teams yet to complete
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                Completion Rate
              </span>
              <div className="font-mono text-2xl font-black text-white mt-1">
                {progress?.percentage || 0}%
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-red-500 transition-all duration-300"
                  style={{ width: `${progress?.percentage || 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-white/10 mb-6">
          <button
            onClick={() => setActiveTab("monitor")}
            className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "monitor"
                ? "border-red-500 text-white"
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Submission Monitor</span>
          </button>

          <button
            onClick={() => setActiveTab("teams")}
            className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "teams"
                ? "border-red-500 text-white"
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Roster & Teams ({teams.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("leaderboard")}
            className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "leaderboard"
                ? "border-red-500 text-white"
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Live Leaderboard</span>
          </button>

          <button
            onClick={() => setActiveTab("audit")}
            className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "audit"
                ? "border-red-500 text-white"
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <History className="w-4 h-4" />
            <span>Audit Log ({auditLogs.length})</span>
          </button>
        </div>

        {/* Tab 1: Submission Monitor */}
        {activeTab === "monitor" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-white">Live Submission Tracker</h2>
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter teams..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder:text-neutral-600 outline-none"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/60 overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs sm:text-sm text-neutral-300">
                <thead className="bg-white/5 border-b border-white/10 text-xs uppercase font-semibold text-neutral-400">
                  <tr>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Team Name</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Voting Submission</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {filteredTeams.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 px-4 text-center text-neutral-500 font-sans">
                        <Users className="w-8 h-8 mx-auto text-neutral-600 mb-2" />
                        <p className="text-sm font-semibold text-neutral-300">No teams registered yet</p>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          Open registration from the lifecycle bar above to invite team leaders to submit applications.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredTeams.map((team) => {
                    const isSubmitted = team.submitted_at !== null;
                    return (
                      <tr key={team.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3.5 font-bold text-red-400">{team.code}</td>
                        <td className="px-4 py-3.5 font-sans font-semibold text-white">
                          <button
                            onClick={() => setSelectedTeam(team)}
                            className="text-left hover:text-red-400 transition-colors cursor-pointer"
                          >
                            {team.name}
                          </button>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-sans font-bold uppercase ${
                              team.status === "APPROVED"
                                ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/60"
                                : team.status === "PENDING"
                                ? "bg-amber-950/60 text-amber-400 border border-amber-800/60"
                                : team.status === "CHANGES_REQUESTED"
                                ? "bg-blue-950/60 text-blue-400 border border-blue-800/60"
                                : "bg-red-950/60 text-red-400 border border-red-800/60"
                            }`}
                          >
                            {team.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center font-sans">
                          {isSubmitted ? (
                            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold text-xs">
                              <CheckCircle className="w-4 h-4" />
                              Submitted (Locked)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-neutral-500 text-xs">
                              <Square className="w-3.5 h-3.5" />
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right font-sans space-x-2">
                          <button
                            onClick={() => setSelectedTeam(team)}
                            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 text-xs font-semibold cursor-pointer"
                          >
                            Inspect Roster
                          </button>
                          {isSubmitted && (
                            <button
                              onClick={() => handleUnlockTeam(team.id, team.name)}
                              className="px-3 py-1 rounded-lg bg-amber-950/40 hover:bg-amber-900/60 border border-amber-600/40 text-amber-300 text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Unlock className="w-3 h-3" />
                              Unlock
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Roster & Teams Management */}
        {activeTab === "teams" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-neutral-400 mr-2 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> Status:
                </span>
                {["ALL", "PENDING", "APPROVED", "CHANGES_REQUESTED", "REJECTED"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setTeamStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      teamStatusFilter === st
                        ? "bg-red-600 text-white"
                        : "bg-white/5 text-neutral-400 hover:text-white"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddTeamModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-red-900/40 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Team</span>
                </button>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Import CSV</span>
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/60 overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs sm:text-sm text-neutral-300">
                <thead className="bg-white/5 border-b border-white/10 text-xs uppercase font-semibold text-neutral-400">
                  <tr>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Team Name</th>
                    <th className="px-4 py-3">Lead & Contact</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Administrative Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredTeams.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 px-4 text-center text-neutral-500 font-sans">
                        <Shield className="w-8 h-8 mx-auto text-neutral-600 mb-2" />
                        <p className="text-sm font-semibold text-neutral-300">No teams found</p>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          {teamStatusFilter === "ALL"
                            ? "No teams registered yet. Open registration or click Add Team to add participants."
                            : `No teams matching status: ${teamStatusFilter}.`}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredTeams.map((team) => (
                    <tr key={team.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3.5 font-mono font-bold text-red-400">{team.code}</td>
                      <td className="px-4 py-3.5 font-semibold text-white">
                        <button
                          onClick={() => setSelectedTeam(team)}
                          className="hover:text-red-400 transition-colors text-left cursor-pointer"
                        >
                          {team.name}
                        </button>
                        {team.institution && (
                          <div className="text-[11px] text-neutral-500 font-normal">{team.institution}</div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-neutral-400">
                        <div className="text-neutral-200">{team.leader_name}</div>
                        <div className="font-mono text-[11px] text-neutral-500">{team.contact}</div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                            team.status === "APPROVED"
                              ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/60"
                              : team.status === "PENDING"
                              ? "bg-amber-950/60 text-amber-400 border border-amber-800/60"
                              : team.status === "CHANGES_REQUESTED"
                              ? "bg-blue-950/60 text-blue-400 border border-blue-800/60"
                              : "bg-red-950/60 text-red-400 border border-red-800/60"
                          }`}
                        >
                          {team.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-1.5">
                        <button
                          onClick={() => setSelectedTeam(team)}
                          className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 text-xs font-semibold cursor-pointer"
                        >
                          Review
                        </button>

                        {(team.status === "PENDING" || team.status === "CHANGES_REQUESTED") && (
                          <button
                            onClick={() => handleApproveTeam(team.id)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-950/60 text-emerald-300 border border-emerald-700/60 hover:bg-emerald-900/80 text-xs font-semibold cursor-pointer"
                          >
                            Approve
                          </button>
                        )}

                        {team.status === "APPROVED" && (
                          <button
                            onClick={() => handleDisqualifyTeam(team.id, "DISQUALIFIED")}
                            className="px-2 py-1 rounded-lg bg-white/5 hover:bg-red-950/50 text-neutral-400 hover:text-red-300 text-xs cursor-pointer"
                            title="Disqualify team"
                          >
                            Disqualify
                          </button>
                        )}

                        {team.status === "DISQUALIFIED" && (
                          <button
                            onClick={() => handleDisqualifyTeam(team.id, "APPROVED")}
                            className="px-2 py-1 rounded-lg bg-emerald-950/50 text-emerald-300 text-xs cursor-pointer"
                            title="Restore team"
                          >
                            Restore
                          </button>
                        )}

                        <button
                          onClick={() => handleResetPassword(team.id, team.code)}
                          className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 text-xs cursor-pointer inline-flex items-center gap-1"
                          title="Reset Password"
                        >
                          <KeyRound className="w-3 h-3" />
                          <span>PW</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Live Leaderboard View (Inside Admin) */}
      {activeTab === "leaderboard" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2">
            <h2 className="text-lg font-bold text-white">Live Evaluated Leaderboard</h2>
            <span className="text-xs text-neutral-400 font-mono">
              Visibility: {eventData?.leaderboard_visible ? "Public" : "Hidden from Public"}
            </span>
          </div>
          <LeaderboardTable entries={leaderboard} />
        </div>
      )}

      {/* Tab 4: Audit Log Viewer */}
      {activeTab === "audit" && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white">System Audit Trail</h2>
          <div className="rounded-2xl border border-white/10 bg-black/60 overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs font-mono text-neutral-300">
              <thead className="bg-white/5 border-b border-white/10 uppercase text-neutral-400 font-semibold">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 px-4 text-center text-neutral-500 font-sans">
                      <History className="w-8 h-8 mx-auto text-neutral-600 mb-2" />
                      <p className="text-sm font-semibold text-neutral-300">No audit activity recorded yet</p>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        Administrative actions and status changes will appear here automatically.
                      </p>
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-2.5 text-neutral-500 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 font-bold text-red-400">{log.actor}</td>
                      <td className="px-4 py-2.5 font-bold text-neutral-200">{log.action}</td>
                      <td className="px-4 py-2.5 text-neutral-400 truncate max-w-xs">
                        {JSON.stringify(log.detail)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Team Details & Review Drawer / Modal */}
      {selectedTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-neutral-950 border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 text-red-400 flex items-center justify-center font-mono font-bold text-sm">
                  {selectedTeam.code}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{selectedTeam.name}</h3>
                  <p className="text-xs text-neutral-400">
                    Leader: {selectedTeam.leader_name} • {selectedTeam.contact}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTeam(null)}
                className="text-neutral-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Status and Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-neutral-500 block text-[10px] uppercase font-bold">Status</span>
                  <span className="font-bold text-white mt-1 block uppercase">{selectedTeam.status}</span>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-neutral-500 block text-[10px] uppercase font-bold">Voting Lock</span>
                  <span className="font-bold text-white mt-1 block">
                    {selectedTeam.submitted_at ? "Submitted" : "Pending"}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-neutral-500 block text-[10px] uppercase font-bold">Members</span>
                  <span className="font-bold text-white mt-1 block">
                    {selectedTeam.members?.length || 0} Listed
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-neutral-500 block text-[10px] uppercase font-bold">Registered</span>
                  <span className="font-bold text-white mt-1 block truncate">
                    {new Date(selectedTeam.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {selectedTeam.changes_requested_note && (
                <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-600/40 text-xs">
                  <span className="font-bold text-blue-300 block mb-1">Active Changes Requested Note:</span>
                  <p className="text-neutral-300">{selectedTeam.changes_requested_note}</p>
                </div>
              )}

              {selectedTeam.description && (
                <div>
                  <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">
                    Project / Team Summary
                  </h4>
                  <p className="text-xs text-neutral-300 bg-white/5 p-3 rounded-xl border border-white/5">
                    {selectedTeam.description}
                  </p>
                </div>
              )}

              {/* Roster Members Table */}
              <div>
                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                  Registered Members ({selectedTeam.members?.length || 0})
                </h4>
                {selectedTeam.members && selectedTeam.members.length > 0 ? (
                  <div className="rounded-xl border border-white/10 overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-white/5 border-b border-white/10 text-neutral-400 font-semibold">
                        <tr>
                          <th className="p-2.5">Name</th>
                          <th className="p-2.5">Role</th>
                          <th className="p-2.5">Email</th>
                          <th className="p-2.5">Phone</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-neutral-300">
                        {selectedTeam.members.map((m: any) => (
                          <tr key={m.id}>
                            <td className="p-2.5 font-bold text-white">{m.name}</td>
                            <td className="p-2.5 text-neutral-400">{m.role || "Member"}</td>
                            <td className="p-2.5 font-mono">{m.email || "—"}</td>
                            <td className="p-2.5 font-mono">{m.phone || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-neutral-500 italic p-3 bg-white/5 rounded-xl">
                    No individual member profiles registered yet.
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {selectedTeam.status !== "APPROVED" && (
                    <button
                      onClick={() => handleApproveTeam(selectedTeam.id)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                    >
                      Approve Registration
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowRequestChangesModal(true);
                      setRequestChangesNote(selectedTeam.changes_requested_note || "");
                    }}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
                  >
                    Request Changes
                  </button>
                  {selectedTeam.status !== "REJECTED" && (
                    <button
                      onClick={() => handleRejectTeam(selectedTeam.id)}
                      className="px-4 py-2 rounded-xl bg-red-950/60 hover:bg-red-900 border border-red-700/60 text-red-300 text-xs font-bold cursor-pointer"
                    >
                      Reject
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleResetPassword(selectedTeam.id, selectedTeam.code)}
                    className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 text-xs font-semibold cursor-pointer"
                  >
                    Reset Password
                  </button>
                  <button
                    onClick={() => setSelectedTeam(null)}
                    className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-bold cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Request Changes Sub-Modal */}
      {showRequestChangesModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-neutral-950 border border-white/20 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Request Registration Changes</h3>
            <p className="text-xs text-neutral-400 mb-4">
              Enter notes for {selectedTeam?.name}. Their team dashboard will prompt them to revise these items.
            </p>
            <form onSubmit={handleRequestChanges} className="space-y-4">
              <textarea
                rows={4}
                required
                value={requestChangesNote}
                onChange={(e) => setRequestChangesNote(e.target.value)}
                placeholder="e.g. Please add at least 3 roster members and specify institutional affiliation..."
                className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-neutral-600 outline-none focus:border-red-500"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRequestChangesModal(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-neutral-400 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
                >
                  Send Change Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Event Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-neutral-950 border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-red-500" />
                <h3 className="text-lg font-bold text-white">Event Configuration</h3>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-neutral-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-neutral-300 mb-1">Event Name</label>
                <input
                  type="text"
                  required
                  value={configForm.name}
                  onChange={(e) => setConfigForm({ ...configForm, name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-300 mb-1">Description / Guidelines</label>
                <textarea
                  rows={3}
                  value={configForm.description}
                  onChange={(e) => setConfigForm({ ...configForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-neutral-300 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={configForm.start_date}
                    onChange={(e) => setConfigForm({ ...configForm, start_date: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-neutral-300 mb-1">End Date</label>
                  <input
                    type="date"
                    value={configForm.end_date}
                    onChange={(e) => setConfigForm({ ...configForm, end_date: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-neutral-300 mb-1">Min Teams (N min)</label>
                  <input
                    type="number"
                    min={2}
                    value={configForm.min_teams}
                    onChange={(e) => setConfigForm({ ...configForm, min_teams: parseInt(e.target.value) || 3 })}
                    className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-neutral-300 mb-1">Max 10s Allowed</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={configForm.max_tens_allowed}
                    onChange={(e) => setConfigForm({ ...configForm, max_tens_allowed: parseInt(e.target.value) || 5 })}
                    className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-neutral-300 mb-1">Leaderboard Default Visibility</label>
                <select
                  value={configForm.leaderboard_visibility}
                  onChange={(e) => setConfigForm({ ...configForm, leaderboard_visibility: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-neutral-900 border border-white/10 text-white outline-none focus:border-red-500"
                >
                  <option value="MEMBERS_ONLY">Members Only (Authenticated teams)</option>
                  <option value="PUBLIC">Public (Accessible to everyone)</option>
                  <option value="HIDDEN">Hidden (Sealed for stage reveal)</option>
                  <option value="FINAL">Final Published (Immutable)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-neutral-400 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer"
                >
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Team Modal */}
      {showAddTeamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-neutral-950 border border-white/15 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Add Team to Roster</h3>
            <form onSubmit={handleCreateTeam} className="space-y-3.5">
              <div>
                <label className="block text-xs uppercase font-semibold text-neutral-400 mb-1">
                  Team Name
                </label>
                <input
                  type="text"
                  required
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="e.g. Team Alpha"
                  className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs uppercase font-semibold text-neutral-400 mb-1">
                  Leader Name
                </label>
                <input
                  type="text"
                  value={newTeamLeader}
                  onChange={(e) => setNewTeamLeader(e.target.value)}
                  placeholder="Leader Name"
                  className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs uppercase font-semibold text-neutral-400 mb-1">
                  Email / Phone
                </label>
                <input
                  type="text"
                  value={newTeamContact}
                  onChange={(e) => setNewTeamContact(e.target.value)}
                  placeholder="contact@team.com"
                  className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
                />
              </div>
              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddTeamModal(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-neutral-400 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer"
                >
                  Create Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-neutral-950 border border-white/15 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">Import Teams from CSV</h3>
            <p className="text-xs text-neutral-400 mb-4">
              Paste CSV rows in the format: <code className="text-red-400">Team Name,Leader Name,Email</code>.
            </p>
            <form onSubmit={handleImportCsv} className="space-y-3.5">
              <textarea
                rows={8}
                required
                value={importCsvText}
                onChange={(e) => setImportCsvText(e.target.value)}
                placeholder={"Team Horizon,Jessica Day,jessica@horizon.dev\nTeam Apex,Jordan Belfort,jordan@apex.com\nTeam Vanguard,Michael Scott,michael@vanguard.io"}
                className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white font-mono text-xs placeholder:text-neutral-600"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-neutral-400 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer"
                >
                  Import Teams
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status Transition Confirmation Modal */}
      {pendingStatusTransition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-neutral-950 border border-white/15 rounded-3xl p-6 sm:p-7 shadow-2xl relative">
            {/* Header */}
            <div className="flex items-start gap-4 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                {pendingStatusTransition === "VOTING_OPEN" ? (
                  <Play className="w-6 h-6 text-emerald-400" />
                ) : pendingStatusTransition === "VOTING_CLOSED" ? (
                  <Square className="w-6 h-6 text-amber-400" />
                ) : pendingStatusTransition === "RESULTS_PUBLISHED" ? (
                  <Trophy className="w-6 h-6 text-yellow-400" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                )}
              </div>
              <div className="flex-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                  Lifecycle Phase Transition Confirmation
                </span>
                <h3 className="text-xl font-black text-white mt-0.5">
                  {pendingStatusTransition === "VOTING_OPEN"
                    ? "Activate Peer Rating (VOTING_OPEN)"
                    : pendingStatusTransition === "VOTING_CLOSED"
                    ? "Close Rating Ballot Box (VOTING_CLOSED)"
                    : pendingStatusTransition === "RESULTS_PUBLISHED"
                    ? "Publish Official Results (RESULTS_PUBLISHED)"
                    : `Transition to ${pendingStatusTransition}`}
                </h3>
              </div>
            </div>

            {/* Content for VOTING_OPEN */}
            {pendingStatusTransition === "VOTING_OPEN" && (() => {
              const approvedCount = teams.filter((t) => t.status === "APPROVED").length;
              const minRequired = eventData?.min_teams ?? 3;
              const hasMinTeams = approvedCount >= minRequired;
              const isRosterFrozen = !!eventData?.roster_frozen_at;
              const canOpen = hasMinTeams && isRosterFrozen;

              return (
                <div className="space-y-4 mb-6">
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    Opening peer rating allows all approved teams to evaluate their peers.
                    Before opening, ensure your roster is locked so matrix dimensions <span className="font-mono text-red-400 font-bold">(N - 1 = {Math.max(0, approvedCount - 1)})</span> are fixed.
                  </p>

                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-400 font-medium">Approved Roster Size:</span>
                      <span className={`font-mono font-bold flex items-center gap-1.5 ${hasMinTeams ? "text-emerald-400" : "text-red-400"}`}>
                        {hasMinTeams ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {approvedCount} teams (minimum required: {minRequired})
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-400 font-medium">Roster Frozen Status:</span>
                      <span className={`font-mono font-bold flex items-center gap-1.5 ${isRosterFrozen ? "text-emerald-400" : "text-red-400"}`}>
                        {isRosterFrozen ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {isRosterFrozen ? "Frozen & Fixed" : "Not Frozen"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-white/5">
                      <span className="text-neutral-400 font-medium">Evaluations Per Team:</span>
                      <span className="font-mono font-bold text-white">
                        {Math.max(0, approvedCount - 1)} peer targets each
                      </span>
                    </div>
                  </div>

                  {!canOpen && (
                    <div className="p-3.5 rounded-2xl bg-red-950/60 border border-red-600/40 text-xs text-red-200 flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">Prerequisites Not Met</span>
                        {!hasMinTeams && <span>• At least {minRequired} approved teams are required.<br /></span>}
                        {!isRosterFrozen && <span>• Roster must be frozen before opening voting. Please click "Freeze & Lock Roster" first.</span>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Content for VOTING_CLOSED */}
            {pendingStatusTransition === "VOTING_CLOSED" && (() => {
              const totalActive = progress?.totalActive || 0;
              const submittedCount = progress?.submittedCount || 0;
              const remainingCount = progress?.remainingCount || 0;
              const hasUnsubmitted = remainingCount > 0;

              return (
                <div className="space-y-4 mb-6">
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    Closing the ballot box locks rating submissions. Teams will no longer be able to submit or edit ballots without organizer authorization.
                  </p>

                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-400 font-medium">Total Eligible Teams:</span>
                      <span className="font-mono font-bold text-white">{totalActive}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-400 font-medium">Ballots Submitted:</span>
                      <span className="font-mono font-bold text-emerald-400">
                        {submittedCount} ({progress?.percentage || 0}%)
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-400 font-medium">Pending Unsubmitted:</span>
                      <span className={`font-mono font-bold ${hasUnsubmitted ? "text-amber-400" : "text-neutral-400"}`}>
                        {remainingCount}
                      </span>
                    </div>
                  </div>

                  {hasUnsubmitted ? (
                    <div className="p-3.5 rounded-2xl bg-amber-950/60 border border-amber-600/40 text-xs text-amber-200 flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">Unsubmitted Teams Warning</span>
                        {remainingCount} approved team(s) have not submitted their ratings yet. If you close voting now, their unsubmitted ratings will be locked out.
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-600/40 text-xs text-emerald-200 flex items-center gap-2.5">
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>All eligible teams have submitted their ratings. Ready to close!</span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Content for RESULTS_PUBLISHED */}
            {pendingStatusTransition === "RESULTS_PUBLISHED" && (
              <div className="space-y-4 mb-6">
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Publishing official results concludes scoring and makes the final leaderboard, rankings, and award allocations visible according to visibility settings.
                </p>

                <div className="p-4 rounded-2xl bg-yellow-950/30 border border-yellow-600/30 text-xs text-yellow-200 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-yellow-400">
                    <Trophy className="w-4 h-4" />
                    <span>Public Results Reveal</span>
                  </div>
                  <p className="text-neutral-300 text-[11px]">
                    Leaderboard visibility will automatically transition to PUBLIC. All participating teams and guests can see final standings and podium finishers.
                  </p>
                </div>
              </div>
            )}

            {/* Content for ARCHIVED */}
            {pendingStatusTransition === "ARCHIVED" && (
              <div className="space-y-4 mb-6">
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Archiving permanently seals the event records into read-only historical storage. All scores, ballots, comments, and audit records remain preserved.
                </p>

                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-xs text-neutral-400">
                  <span className="font-bold text-white block mb-1">Historical Archive Mode</span>
                  No further votes, team roster modifications, or comment changes will be accepted.
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPendingStatusTransition(null)}
                className="px-4 py-2.5 rounded-xl border border-white/10 text-neutral-400 hover:text-white text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleUpdateEventStatus(pendingStatusTransition)}
                disabled={
                  actionLoading ||
                  (pendingStatusTransition === "VOTING_OPEN" &&
                    (teams.filter((t) => t.status === "APPROVED").length < (eventData?.min_teams ?? 3) ||
                      !eventData?.roster_frozen_at))
                }
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg shadow-red-950/60 transition-all"
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm & Transition Phase</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
