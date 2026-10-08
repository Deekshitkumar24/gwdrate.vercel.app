"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import {
  MessageSquare,
  Megaphone,
  HelpCircle,
  Pin,
  Send,
  Trash2,
  Shield,
  Users,
  CheckCircle,
  AlertTriangle,
  Lock,
  CornerDownRight,
  RefreshCw,
  Sparkles,
} from "lucide-react";

interface CommunityMessage {
  id: string;
  event_id: string;
  author_id: string;
  author_name: string;
  author_team_code: string;
  author_role: "admin" | "leader" | "member";
  channel: string;
  content: string;
  is_announcement: boolean;
  is_pinned: boolean;
  reply_to_id: string | null;
  created_at: string;
}

export default function CommunityPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [teamProfile, setTeamProfile] = useState<any>(null);
  const [eventData, setEventData] = useState<any>(null);
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [activeChannel, setActiveChannel] = useState<"announcements" | "general" | "qa">("general");

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [accessDenied, setAccessDenied] = useState<{ denied: boolean; reason: string; status?: string }>({
    denied: false,
    reason: "",
  });

  const [newMessage, setNewMessage] = useState("");
  const [replyTo, setReplyTo] = useState<CommunityMessage | null>(null);
  const [isAdminAnnouncement, setIsAdminAnnouncement] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    try {
      // 1. Auth check
      const meRes = await fetch("/api/auth/me");
      if (meRes.status === 401) {
        setAccessDenied({
          denied: true,
          reason: "Please log in to enter the private member community.",
        });
        setLoading(false);
        return;
      }
      const meData = await meRes.json();
      if (!meData.authenticated) {
        setAccessDenied({
          denied: true,
          reason: "Please log in to enter the private member community.",
        });
        setLoading(false);
        return;
      }
      setCurrentUser(meData.user);
      if (meData.team) setTeamProfile(meData.team);

      // Check team status
      if (meData.user.role === "team" && meData.team) {
        if (meData.team.status !== "APPROVED") {
          setAccessDenied({
            denied: true,
            status: meData.team.status,
            reason:
              meData.team.status === "PENDING"
                ? "Your team registration is currently under review by event administrators. Community access will unlock as soon as your team is approved."
                : meData.team.status === "CHANGES_REQUESTED"
                ? "Changes were requested for your team registration. Please update your details in the dashboard to gain full community clearance."
                : "Your team does not currently have approved access to this private community.",
          });
          setLoading(false);
          return;
        }
      }

      // 2. Fetch event info
      const eventRes = await fetch("/api/leaderboard");
      const eventJson = await eventRes.json();
      if (eventJson.event) setEventData(eventJson.event);

      // 3. Fetch messages for the active channel
      const msgRes = await fetch(`/api/community/messages?channel=${activeChannel}`);
      if (msgRes.status === 403) {
        const errJson = await msgRes.json();
        setAccessDenied({ denied: true, reason: errJson.message });
        setLoading(false);
        return;
      }
      const msgJson = await msgRes.json();
      if (msgJson.messages) {
        setMessages(msgJson.messages);
      }
    } catch (err: any) {
      console.error("Community load error:", err);
    } finally {
      setLoading(false);
    }
  }, [activeChannel]);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      // Background poll every 8s
      fetch(`/api/community/messages?channel=${activeChannel}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.messages) setMessages(data.messages);
        })
        .catch(() => {});
    }, 8000);
    return () => clearInterval(interval);
  }, [loadData, activeChannel]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch("/api/community/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: activeChannel,
          content: newMessage.trim(),
          reply_to_id: replyTo?.id || null,
          is_announcement: isAdminAnnouncement,
          is_pinned: isPinned,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);

      setNewMessage("");
      setReplyTo(null);
      setIsAdminAnnouncement(false);
      setIsPinned(false);

      // Refresh list
      const updatedRes = await fetch(`/api/community/messages?channel=${activeChannel}`);
      const updatedJson = await updatedRes.json();
      if (updatedJson.messages) {
        setMessages(updatedJson.messages);
      }
      setTimeout(scrollToBottom, 100);
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to post message." });
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!confirm("Are you sure you want to remove this message?")) return;
    try {
      const res = await fetch(`/api/community/messages?messageId=${msgId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    } catch (err: any) {
      alert(err.message || "Failed to delete message");
    }
  };

  const handleTogglePin = async (msgId: string, currentPin: boolean) => {
    try {
      const res = await fetch(`/api/community/messages?messageId=${msgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_pinned: !currentPin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, is_pinned: !currentPin } : m))
      );
    } catch (err: any) {
      alert(err.message || "Failed to pin message");
    }
  };

  const isAdmin = currentUser?.role === "admin";

  return (
    <div className="min-h-screen bg-transparent text-white flex flex-col relative selection:bg-red-600 selection:text-white">
      <Navbar currentUser={currentUser} eventStatus={eventData?.status} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 flex flex-col">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-red-400 uppercase tracking-wider mb-1">
              <Users className="w-4 h-4" />
              <span>Private Member-Only Space</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              Event Community
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Verified Participants
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1">
              Direct peer communication, organizer directives, and real-time event assistance.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => loadData()}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-neutral-300 hover:text-white flex items-center gap-2 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-neutral-400" />
              <span>Refresh</span>
            </button>
            <Link
              href="/updates"
              className="px-3.5 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-xs font-semibold text-red-300 flex items-center gap-2 transition-all"
            >
              <Megaphone className="w-3.5 h-3.5 text-red-400" />
              <span>Official Updates Feed</span>
            </Link>
          </div>
        </div>

        {/* Access Barrier if not approved */}
        {accessDenied.denied ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-md w-full backdrop-blur-xl bg-black/70 border border-white/10 rounded-3xl p-8 text-center shadow-2xl">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-4 text-amber-400">
                <Lock className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Private Member Community</h2>
              <p className="text-sm text-neutral-400 leading-relaxed mb-6">
                {accessDenied.reason}
              </p>

              {accessDenied.status && (
                <div className="mb-6 p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-neutral-300 flex items-center justify-center gap-2">
                  <span>Current Registration Status:</span>
                  <span className="font-bold text-amber-400 uppercase">{accessDenied.status}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                {currentUser ? (
                  <Link
                    href="/dashboard"
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-lg shadow-red-900/50"
                  >
                    View Team Dashboard
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-lg shadow-red-900/50"
                    >
                      Log In to Access
                    </Link>
                    <Link
                      href="/register"
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 text-xs font-bold transition-all"
                    >
                      Register a Team
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1">
            {/* Channel Sidebar */}
            <div className="lg:col-span-1 flex flex-col gap-3">
              <div className="backdrop-blur-xl bg-black/60 border border-white/10 rounded-2xl p-4">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-3">
                  Channels
                </span>
                <nav className="flex flex-col gap-1.5">
                  <button
                    onClick={() => setActiveChannel("general")}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeChannel === "general"
                        ? "bg-red-600 text-white shadow-lg shadow-red-950/50"
                        : "text-neutral-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <MessageSquare className="w-4 h-4 shrink-0" />
                      <span>General Discussion</span>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveChannel("announcements")}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeChannel === "announcements"
                        ? "bg-red-600 text-white shadow-lg shadow-red-950/50"
                        : "text-neutral-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Megaphone className="w-4 h-4 shrink-0" />
                      <span>Announcements</span>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveChannel("qa")}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeChannel === "qa"
                        ? "bg-red-600 text-white shadow-lg shadow-red-950/50"
                        : "text-neutral-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <HelpCircle className="w-4 h-4 shrink-0" />
                      <span>Peer & Event Q&A</span>
                    </div>
                  </button>
                </nav>
              </div>

              {/* Identity Card */}
              <div className="backdrop-blur-xl bg-black/60 border border-white/10 rounded-2xl p-4 text-xs">
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block mb-2">
                  Your Identity
                </span>
                {isAdmin ? (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/40 text-red-400 flex items-center justify-center font-bold shrink-0">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-white">Event Organizer</p>
                      <p className="text-[10px] text-red-400 font-semibold uppercase">Administrator Privileges</p>
                    </div>
                  </div>
                ) : teamProfile ? (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 text-white flex items-center justify-center font-mono font-bold text-[11px] shrink-0">
                      {teamProfile.code}
                    </div>
                    <div className="truncate">
                      <p className="font-bold text-white truncate">{teamProfile.name}</p>
                      <p className="text-[10px] text-neutral-400 truncate">
                        Leader: {teamProfile.leader_name}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-neutral-400">Authenticated Member</p>
                )}
              </div>

              {/* Guidelines */}
              <div className="backdrop-blur-xl bg-black/40 border border-white/5 rounded-2xl p-4 text-[11px] text-neutral-400 space-y-2">
                <div className="font-bold text-neutral-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Community Protocol</span>
                </div>
                <p>• Respect all participating teams and adhere to event sportsmanship.</p>
                <p>• Avoid publishing private peer rating deliberations in open chat.</p>
                <p>• Report urgent technical issues directly in Peer Q&A or to organizers.</p>
              </div>
            </div>

            {/* Chat & Messages Column */}
            <div className="lg:col-span-3 flex flex-col backdrop-blur-xl bg-black/60 border border-white/10 rounded-3xl overflow-hidden shadow-2xl min-h-[580px]">
              {/* Channel Topbar */}
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  {activeChannel === "general" && <MessageSquare className="w-4 h-4 text-neutral-300" />}
                  {activeChannel === "announcements" && <Megaphone className="w-4 h-4 text-red-400" />}
                  {activeChannel === "qa" && <HelpCircle className="w-4 h-4 text-blue-400" />}
                  <span className="font-bold text-sm text-white capitalize">
                    {activeChannel === "qa" ? "Peer & Event Q&A" : activeChannel}
                  </span>
                  <span className="text-[11px] text-neutral-500 font-mono">
                    ({messages.length} messages)
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Sync
                </span>
              </div>

              {/* Message Feed */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4 max-h-[500px]">
                {loading ? (
                  <div className="h-64 flex flex-col items-center justify-center text-neutral-500 text-xs">
                    <RefreshCw className="w-6 h-6 animate-spin mb-2" />
                    <span>Loading conversation stream...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-neutral-500 text-xs text-center">
                    <MessageSquare className="w-8 h-8 text-neutral-600 mb-2" />
                    <span className="text-sm font-semibold text-neutral-400">No community messages yet</span>
                    <span className="mt-1 max-w-xs">Be the first to start the discussion!</span>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isAuthor =
                      (isAdmin && msg.author_role === "admin") ||
                      (teamProfile && msg.author_id === teamProfile.id);

                    const replyingTarget = msg.reply_to_id
                      ? messages.find((m) => m.id === msg.reply_to_id)
                      : null;

                    return (
                      <div
                        key={msg.id}
                        className={`group relative rounded-2xl p-4 transition-all ${
                          msg.is_pinned
                            ? "bg-red-950/20 border border-red-500/30"
                            : msg.is_announcement
                            ? "bg-amber-950/20 border border-amber-500/30"
                            : "bg-white/[0.03] hover:bg-white/[0.05] border border-white/5"
                        }`}
                      >
                        {/* Pinned Pill */}
                        {msg.is_pinned && (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-red-400 uppercase tracking-wider mb-2">
                            <Pin className="w-3 h-3" />
                            <span>Pinned Message</span>
                          </div>
                        )}

                        {/* Reply Banner */}
                        {replyingTarget && (
                          <div className="mb-2 p-2 rounded-lg bg-white/5 border border-white/5 text-[11px] text-neutral-400 flex items-center gap-2">
                            <CornerDownRight className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                            <span className="text-neutral-300 font-semibold truncate">
                              Replying to {replyingTarget.author_name} ({replyingTarget.author_team_code}):
                            </span>
                            <span className="truncate italic">"{replyingTarget.content}"</span>
                          </div>
                        )}

                        {/* Author Header */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            {msg.author_role === "admin" ? (
                              <span className="px-2 py-0.5 rounded-md bg-red-600/30 border border-red-500/40 text-[10px] font-bold text-red-300 flex items-center gap-1">
                                <Shield className="w-2.5 h-2.5" />
                                ORGANIZER
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-white/10 border border-white/20 font-mono text-[10px] font-bold text-neutral-200">
                                {msg.author_team_code}
                              </span>
                            )}

                            <span className="text-xs font-bold text-white">
                              {msg.author_name}
                            </span>

                            {msg.author_role === "leader" && (
                              <span className="text-[10px] text-neutral-400 bg-white/5 px-1.5 py-0.5 rounded">
                                Leader
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-neutral-500">
                              {new Date(msg.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>

                            {/* Moderator / Author actions */}
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                              <button
                                onClick={() => setReplyTo(msg)}
                                title="Reply"
                                className="p-1 rounded text-neutral-400 hover:text-white hover:bg-white/10 cursor-pointer"
                              >
                                <CornerDownRight className="w-3 h-3" />
                              </button>

                              {isAdmin && (
                                <button
                                  onClick={() => handleTogglePin(msg.id, msg.is_pinned)}
                                  title={msg.is_pinned ? "Unpin" : "Pin"}
                                  className={`p-1 rounded cursor-pointer ${
                                    msg.is_pinned
                                      ? "text-red-400 hover:text-red-300 bg-red-950/40"
                                      : "text-neutral-400 hover:text-white hover:bg-white/10"
                                  }`}
                                >
                                  <Pin className="w-3 h-3" />
                                </button>
                              )}

                              {(isAuthor || isAdmin) && (
                                <button
                                  onClick={() => handleDeleteMessage(msg.id)}
                                  title="Delete"
                                  className="p-1 rounded text-neutral-400 hover:text-red-400 hover:bg-red-950/40 cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="text-xs sm:text-sm text-neutral-200 leading-relaxed whitespace-pre-wrap">
                          {msg.content}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Composer */}
              <div className="p-4 border-t border-white/10 bg-white/[0.01]">
                {/* Replying banner */}
                {replyTo && (
                  <div className="mb-2 p-2 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <CornerDownRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      <span className="text-neutral-400">Replying to:</span>
                      <span className="font-bold text-white truncate">
                        {replyTo.author_name} ({replyTo.author_team_code})
                      </span>
                    </div>
                    <button
                      onClick={() => setReplyTo(null)}
                      className="text-neutral-400 hover:text-white text-xs px-2 py-0.5 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* Admin broadcast controls */}
                {isAdmin && (
                  <div className="flex flex-wrap items-center gap-4 mb-2 px-1 text-xs text-neutral-300">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isAdminAnnouncement}
                        onChange={(e) => setIsAdminAnnouncement(e.target.checked)}
                        className="rounded border-white/20 bg-black/40 text-red-600 focus:ring-0 cursor-pointer"
                      />
                      <span>Mark as Official Announcement</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isPinned}
                        onChange={(e) => setIsPinned(e.target.checked)}
                        className="rounded border-white/20 bg-black/40 text-red-600 focus:ring-0 cursor-pointer"
                      />
                      <span>Pin to Top of Channel</span>
                    </label>
                  </div>
                )}

                {/* Textarea & Send button */}
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <div className="relative flex-1">
                    <textarea
                      rows={2}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e);
                        }
                      }}
                      placeholder={`Message #${activeChannel}... (Press Enter to send, Shift+Enter for newline)`}
                      className="w-full px-4 py-3 rounded-2xl bg-black/50 border border-white/10 focus:border-red-500 focus:ring-1 focus:ring-red-500 text-xs sm:text-sm text-white placeholder-neutral-500 resize-none transition-all outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="self-end px-5 py-3 rounded-2xl bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:hover:bg-red-600 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-red-950/60 cursor-pointer"
                  >
                    {sending ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">Send</span>
                  </button>
                </form>

                {feedback && (
                  <p
                    className={`mt-2 text-xs font-semibold ${
                      feedback.type === "success" ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {feedback.text}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
