"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import GwdLogo from "@/components/GwdLogo";
import {
  User,
  Mail,
  Lock,
  Phone,
  Building,
  FileText,
  Users,
  Plus,
  Trash2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Copy,
  Check,
  AlertCircle,
  Clock,
  Sparkles,
} from "lucide-react";

interface MemberInput {
  name: string;
  role: string;
  email: string;
}

export default function RegisterPage() {
  const [eventData, setEventData] = useState<{
    id: string;
    name: string;
    status: string;
  } | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);

  // Form Steps: 1: Team, 2: Leader, 3: Members, 4: Review
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Team Info
  const [teamName, setTeamName] = useState("");
  const [institution, setInstitution] = useState("");
  const [description, setDescription] = useState("");

  // Step 2: Leader Info
  const [leaderName, setLeaderName] = useState("");
  const [leaderEmail, setLeaderEmail] = useState("");
  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");

  // Step 3: Members
  const [members, setMembers] = useState<MemberInput[]>([
    { name: "", role: "Frontend Dev", email: "" },
  ]);

  // Submission State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    teamCode: string;
    teamName: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => {
        setEventData(data.event || null);
        setLoadingEvent(false);
      })
      .catch(() => {
        setLoadingEvent(false);
      });
  }, []);

  const isRegOpen =
    eventData?.status === "REGISTRATION" ||
    eventData?.status === "REGISTRATION_OPEN";

  const addMemberField = () => {
    setMembers([...members, { name: "", role: "Developer", email: "" }]);
  };

  const removeMemberField = (idx: number) => {
    setMembers(members.filter((_, i) => i !== idx));
  };

  const updateMember = (idx: number, field: keyof MemberInput, val: string) => {
    const updated = [...members];
    updated[idx][field] = val;
    setMembers(updated);
  };

  const validateStep1 = () => {
    if (!teamName.trim() || teamName.trim().length < 2) {
      setError("Please provide a valid team name (at least 2 characters).");
      return false;
    }
    setError(null);
    return true;
  };

  const validateStep2 = () => {
    if (!leaderName.trim()) {
      setError("Team leader name is required.");
      return false;
    }
    if (!leaderEmail.trim() || !leaderEmail.includes("@")) {
      setError("Please enter a valid leader email address.");
      return false;
    }
    if (!contact.trim()) {
      setError("Contact phone or handle is required.");
      return false;
    }
    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters.");
      return false;
    }
    setError(null);
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
    else if (step === 3) setStep(4);
  };

  const handlePrev = () => {
    setError(null);
    if (step > 1) setStep((s) => (s - 1) as any);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep1() || !validateStep2()) return;

    setLoading(true);
    setError(null);

    const validMembers = members
      .filter((m) => m.name.trim().length > 0)
      .map((m) => ({
        name: m.name.trim(),
        role: m.role.trim() || "Member",
        email: m.email.trim() || undefined,
      }));

    try {
      const res = await fetch("/api/teams/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: teamName.trim(),
          leader_name: leaderName.trim(),
          contact: contact.trim(),
          leader_email: leaderEmail.trim(),
          institution: institution.trim(),
          description: description.trim(),
          password,
          members: validMembers,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Registration failed.");
      }

      setSuccessData({
        teamCode: data.teamCode,
        teamName: data.team?.name || teamName.trim(),
      });
    } catch (err: any) {
      setError(err.message || "An error occurred during registration.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (successData?.teamCode) {
      navigator.clipboard.writeText(successData.teamCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 relative selection:bg-red-600 selection:text-white">
      <main className="w-full max-w-xl z-10 animate-in fade-in duration-300 my-8">
        <div className="backdrop-blur-xl bg-black/75 border border-white/15 rounded-3xl p-6 sm:p-9 shadow-2xl shadow-red-950/40">
          {/* Header */}
          <div className="text-center mb-6">
            <GwdLogo size="lg" className="mx-auto mb-3" />
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Team Registration
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1">
              {eventData?.name || "Live Competition Event Registration"}
            </p>
          </div>

          {loadingEvent ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-red-500" />
              <p className="text-xs text-neutral-400">Verifying event registration status...</p>
            </div>
          ) : !isRegOpen && !successData ? (
            /* Registration Closed or Not Yet Open State */
            <div className="text-center py-8">
              <div className="w-14 h-14 rounded-2xl bg-amber-950/40 border border-amber-600/40 text-amber-400 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-white">
                {eventData?.status === "DRAFT"
                  ? "Registration Not Yet Open"
                  : "Registration Has Closed"}
              </h2>
              <p className="text-xs sm:text-sm text-neutral-400 mt-2 max-w-md mx-auto leading-relaxed">
                {eventData?.status === "DRAFT"
                  ? "The organizer is currently setting up the competition. Registration will be announced shortly."
                  : "Team registration for this event has concluded. If your team is already registered, please log in with your Team ID."}
              </p>
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/login"
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs sm:text-sm transition-all shadow-lg shadow-red-900/40"
                >
                  Go to Team Login
                </Link>
                <Link
                  href="/leaderboard"
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white font-semibold text-xs sm:text-sm transition-all"
                >
                  View Event Leaderboard
                </Link>
              </div>
            </div>
          ) : successData ? (
            /* Registration Confirmation Screen with Generated Team ID */
            <div className="text-center py-4 animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 rounded-3xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-950/50">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <h2 className="text-2xl font-black text-white">Registration Submitted!</h2>
              <p className="text-xs sm:text-sm text-neutral-300 mt-1">
                Your team <strong className="text-white">{successData.teamName}</strong> has been registered.
              </p>

              {/* Unique Generated Team ID Card */}
              <div className="my-6 p-5 rounded-2xl bg-neutral-900/90 border border-red-500/30 text-center relative overflow-hidden">
                <div className="text-[11px] font-bold text-red-400 uppercase tracking-widest mb-1">
                  Official Team Identifier
                </div>
                <div className="text-3xl sm:text-4xl font-mono font-black text-white tracking-widest my-1 selection:bg-red-600">
                  {successData.teamCode}
                </div>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Save this code securely. It is used by your team leader to log in.
                </p>

                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-semibold text-white transition-all cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied to Clipboard</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-neutral-300" />
                      <span>Copy Team ID</span>
                    </>
                  )}
                </button>
              </div>

              {/* Next Steps Roadmap */}
              <div className="text-left bg-white/5 border border-white/10 rounded-2xl p-4 mb-6 space-y-3">
                <div className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                  What Happens Next
                </div>
                <div className="flex items-start gap-3 text-xs text-neutral-300">
                  <span className="w-5 h-5 rounded-full bg-amber-950 border border-amber-600 text-amber-300 font-bold flex items-center justify-center shrink-0">1</span>
                  <span><strong>Organizer Review:</strong> An administrator will review your team roster and approve your participation.</span>
                </div>
                <div className="flex items-start gap-3 text-xs text-neutral-300">
                  <span className="w-5 h-5 rounded-full bg-neutral-800 border border-neutral-600 text-neutral-300 font-bold flex items-center justify-center shrink-0">2</span>
                  <span><strong>Sign In:</strong> Log into the <strong>Team Portal</strong> using your Team ID and password to manage members or update details.</span>
                </div>
                <div className="flex items-start gap-3 text-xs text-neutral-300">
                  <span className="w-5 h-5 rounded-full bg-neutral-800 border border-neutral-600 text-neutral-300 font-bold flex items-center justify-center shrink-0">3</span>
                  <span><strong>Community & Voting:</strong> Once approved, access the private community and participate when voting opens.</span>
                </div>
              </div>

              <Link
                href="/login"
                className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-red-900/40 transition-all cursor-pointer"
              >
                <span>Proceed to Team Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            /* Multi-Step Registration Experience */
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Step Indicator */}
              <div className="grid grid-cols-4 gap-2 mb-2">
                {[
                  { num: 1, label: "Team" },
                  { num: 2, label: "Leader" },
                  { num: 3, label: "Members" },
                  { num: 4, label: "Review" },
                ].map((s) => (
                  <div
                    key={s.num}
                    onClick={() => {
                      if (s.num < step) setStep(s.num as any);
                    }}
                    className={`text-center py-2 rounded-xl text-xs font-bold border transition-all ${
                      step === s.num
                        ? "bg-red-600/30 border-red-500 text-white shadow-md shadow-red-950/40"
                        : step > s.num
                        ? "bg-emerald-950/40 border-emerald-600/50 text-emerald-300 cursor-pointer"
                        : "bg-white/5 border-white/5 text-neutral-500"
                    }`}
                  >
                    <span className="block">{s.num}. {s.label}</span>
                  </div>
                ))}
              </div>

              {error && (
                <div className="p-3.5 rounded-xl bg-red-950/70 border border-red-600/50 text-red-200 text-xs sm:text-sm font-medium flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* STEP 1: Team Information */}
              {step === 1 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div>
                    <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                      Team Name *
                    </label>
                    <div className="relative">
                      <Users className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        placeholder="e.g. Team Phoenix"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-900/80 border border-white/10 text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                      Institution / Organization
                    </label>
                    <div className="relative">
                      <Building className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={institution}
                        onChange={(e) => setInstitution(e.target.value)}
                        placeholder="e.g. Stanford University or Acme Labs"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-900/80 border border-white/10 text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                      Project Description / Brief
                    </label>
                    <div className="relative">
                      <FileText className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
                      <textarea
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Short summary of your team's project, thesis, or submission..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-900/80 border border-white/10 text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors resize-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Team Leader */}
              {step === 2 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div>
                    <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                      Team Leader Name *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        value={leaderName}
                        onChange={(e) => setLeaderName(e.target.value)}
                        placeholder="e.g. Sarah Chen"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-900/80 border border-white/10 text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                      Team Leader Email *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
                      <input
                        type="email"
                        required
                        value={leaderEmail}
                        onChange={(e) => setLeaderEmail(e.target.value)}
                        placeholder="sarah@phoenix.dev"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-900/80 border border-white/10 text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                      Phone / Instant Contact *
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        value={contact}
                        onChange={(e) => setContact(e.target.value)}
                        placeholder="+1 (555) 234-5678"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-900/80 border border-white/10 text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                      Team Account Password *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Minimum 8 characters"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-900/80 border border-white/10 text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: Team Members */}
              {step === 3 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">Team Members (Optional)</h3>
                      <p className="text-[11px] text-neutral-400">Add co-members to your official event roster.</p>
                    </div>
                    <button
                      type="button"
                      onClick={addMemberField}
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold text-white flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Member</span>
                    </button>
                  </div>

                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {members.map((mem, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2 relative"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-neutral-400 uppercase">
                            Member #{idx + 1}
                          </span>
                          {members.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeMemberField(idx)}
                              className="text-neutral-500 hover:text-red-400 p-1 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            placeholder="Full Name"
                            value={mem.name}
                            onChange={(e) => updateMember(idx, "name", e.target.value)}
                            className="px-3 py-1.5 rounded-lg bg-neutral-900/90 border border-white/10 text-xs text-white placeholder-neutral-500"
                          />
                          <input
                            type="text"
                            placeholder="Role (e.g. AI / Frontend)"
                            value={mem.role}
                            onChange={(e) => updateMember(idx, "role", e.target.value)}
                            className="px-3 py-1.5 rounded-lg bg-neutral-900/90 border border-white/10 text-xs text-white placeholder-neutral-500"
                          />
                          <input
                            type="email"
                            placeholder="Email (optional)"
                            value={mem.email}
                            onChange={(e) => updateMember(idx, "email", e.target.value)}
                            className="px-3 py-1.5 rounded-lg bg-neutral-900/90 border border-white/10 text-xs text-white placeholder-neutral-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 4: Review & Confirmation */}
              {step === 4 && (
                <div className="space-y-4 animate-in fade-in duration-200 text-xs">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                    <div className="font-bold text-sm text-white border-b border-white/10 pb-2 flex items-center justify-between">
                      <span>Registration Summary</span>
                      <span className="text-[11px] font-normal text-neutral-400">Review before final submit</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-neutral-300">
                      <div>
                        <span className="text-neutral-500 block uppercase text-[10px]">Team Name</span>
                        <strong className="text-white text-sm">{teamName}</strong>
                      </div>
                      <div>
                        <span className="text-neutral-500 block uppercase text-[10px]">Institution</span>
                        <span className="text-white">{institution || "—"}</span>
                      </div>
                      <div>
                        <span className="text-neutral-500 block uppercase text-[10px]">Team Leader</span>
                        <span className="text-white">{leaderName}</span>
                      </div>
                      <div>
                        <span className="text-neutral-500 block uppercase text-[10px]">Leader Email</span>
                        <span className="text-white">{leaderEmail}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-neutral-500 block uppercase text-[10px]">Roster Members</span>
                        <span className="text-neutral-200">
                          {members.filter((m) => m.name.trim()).length > 0
                            ? `${members.filter((m) => m.name.trim()).length + 1} total members (Leader + ${members.filter((m) => m.name.trim()).length} members)`
                            : "1 member (Leader)"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-neutral-400 text-center">
                    By submitting, your team will enter the pending review queue. An official unique Team ID will be automatically generated upon submission.
                  </p>
                </div>
              )}

              {/* Controls */}
              <div className="flex items-center justify-between gap-3 pt-2">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                ) : (
                  <Link
                    href="/login"
                    className="text-xs text-neutral-400 hover:text-white transition-colors"
                  >
                    Already have a Team ID? <span className="text-red-400 underline">Sign In</span>
                  </Link>
                )}

                {step < 4 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-lg shadow-red-900/40 transition-all cursor-pointer ml-auto"
                  >
                    <span>Next</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-red-900/40 transition-all cursor-pointer ml-auto"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Confirm & Register Team</span>
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
