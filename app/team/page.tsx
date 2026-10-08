"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import {
  Users,
  UserPlus,
  Trash2,
  Edit2,
  ShieldCheck,
  Building,
  Mail,
  Phone,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  User,
} from "lucide-react";

interface TeamMember {
  id: string;
  name: string;
  email?: string;
  role: string;
  is_leader: boolean;
  active: boolean;
}

export default function TeamManagementPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [team, setTeam] = useState<any>(null);
  const [eventData, setEventData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  // Form fields
  const [formName, setFormName] = useState("");
  const [formRole, setFormRole] = useState("Frontend Developer");
  const [formEmail, setFormEmail] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadTeamData = useCallback(async () => {
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
      setCurrentUser(meData.user);

      const teamRes = await fetch("/api/teams/me");
      if (teamRes.ok) {
        const tData = await teamRes.json();
        setTeam(tData.team);
        setEventData(tData.event);
      }
    } catch (err) {
      console.error("Team load error:", err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadTeamData();
  }, [loadTeamData]);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    setActionLoading(true);
    try {
      const res = await fetch("/api/teams/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          role: formRole.trim(),
          email: formEmail.trim() || undefined,
          is_leader: false,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);

      showToast(`Added ${formName.trim()} to team roster.`);
      setShowAddModal(false);
      setFormName("");
      setFormRole("Developer");
      setFormEmail("");
      await loadTeamData();
    } catch (err: any) {
      showToast(err.message || "Failed to add member.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !formName.trim()) return;

    setActionLoading(true);
    try {
      const res = await fetch("/api/teams/members", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: selectedMember.id,
          updates: {
            name: formName.trim(),
            role: formRole.trim(),
            email: formEmail.trim() || undefined,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);

      showToast(`Updated ${formName.trim()}.`);
      setShowEditModal(false);
      setSelectedMember(null);
      await loadTeamData();
    } catch (err: any) {
      showToast(err.message || "Failed to update member.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from your team roster?`)) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/teams/members?memberId=${memberId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);

      showToast(`Removed ${name} from roster.`);
      await loadTeamData();
    } catch (err: any) {
      showToast(err.message || "Failed to remove member.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const openEditModal = (mem: TeamMember) => {
    setSelectedMember(mem);
    setFormName(mem.name);
    setFormRole(mem.role);
    setFormEmail(mem.email || "");
    setShowEditModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent text-white flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
        <p className="text-xs text-neutral-400">Loading team roster...</p>
      </div>
    );
  }

  const members: TeamMember[] = team?.members || [];

  return (
    <div className="min-h-screen bg-transparent text-white flex flex-col relative selection:bg-red-600 selection:text-white">
      <Navbar currentUser={currentUser} eventStatus={eventData?.status} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24">
        {/* Back navigation */}
        <div className="mb-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </Link>
        </div>

        {/* Feedback alert */}
        {feedback && (
          <div
            className={`p-3.5 mb-5 rounded-2xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all ${
              feedback.type === "success"
                ? "bg-emerald-950/70 border border-emerald-600/50 text-emerald-200"
                : "bg-red-950/70 border border-red-600/50 text-red-200"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Team Summary Card */}
        <div className="backdrop-blur-xl bg-black/60 border border-white/10 rounded-3xl p-6 sm:p-7 mb-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-red-400 uppercase tracking-wider mb-1">
              <span>Team Code: {team?.code}</span>
              <span className="text-neutral-500">•</span>
              <span className="text-neutral-300">{team?.status}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {team?.name}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1">
              Official Team Roster & Role Assignments ({members.length} total members)
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setFormName("");
              setFormRole("Developer");
              setFormEmail("");
              setShowAddModal(true);
            }}
            className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-900/40 transition-all cursor-pointer shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Team Member</span>
          </button>
        </div>

        {/* Members Roster List */}
        <div className="backdrop-blur-xl bg-black/60 border border-white/10 rounded-3xl p-6 sm:p-7 shadow-xl">
          <h2 className="text-base sm:text-lg font-bold text-white mb-4">
            Participating Members
          </h2>

          <div className="space-y-3">
            {members.map((mem) => (
              <div
                key={mem.id}
                className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                      mem.is_leader
                        ? "bg-red-950/80 border border-red-600/60 text-red-300"
                        : "bg-neutral-800 border border-white/10 text-neutral-200"
                    }`}
                  >
                    {mem.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{mem.name}</span>
                      {mem.is_leader && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-950 text-red-400 border border-red-800">
                          Team Leader
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400 mt-0.5">
                      <span>{mem.role}</span>
                      {mem.email && (
                        <>
                          <span className="text-neutral-600">•</span>
                          <span className="font-mono text-[11px] text-neutral-300">{mem.email}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => openEditModal(mem)}
                    title="Edit Member"
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {!mem.is_leader && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(mem.id, mem.name)}
                      title="Remove Member"
                      className="p-2 rounded-lg bg-white/5 hover:bg-red-950/60 text-neutral-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-neutral-900 border border-white/15 rounded-3xl p-6 sm:p-7 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-white mb-1">Add Team Member</h3>
            <p className="text-xs text-neutral-400 mb-4">
              Add another contributor to your team roster.
            </p>

            <form onSubmit={handleAddMember} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jordan Reed"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase mb-1">
                  Role / Specialization *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Frontend, AI Engineer, UI/UX"
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase mb-1">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  placeholder="jordan@example.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-neutral-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-red-900/40"
                >
                  {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Add Member</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {showEditModal && selectedMember && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-neutral-900 border border-white/15 rounded-3xl p-6 sm:p-7 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-white mb-1">Edit Team Member</h3>
            <p className="text-xs text-neutral-400 mb-4">
              Update details for {selectedMember.name}.
            </p>

            <form onSubmit={handleUpdateMember} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase mb-1">
                  Role / Specialization *
                </label>
                <input
                  type="text"
                  required
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-xs text-white"
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
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-red-900/40"
                >
                  {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
