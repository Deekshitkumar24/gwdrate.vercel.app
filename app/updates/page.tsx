"use client";

import React, { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import {
  Megaphone,
  Pin,
  Calendar,
  AlertCircle,
  Flag,
  Clock,
  Sparkles,
  Plus,
  Trash2,
  Shield,
  RefreshCw,
  Search,
} from "lucide-react";

interface Announcement {
  id: string;
  event_id: string;
  title: string;
  content: string;
  type: "PHASE_CHANGE" | "ADMIN_ANNOUNCEMENT" | "DEADLINE" | "SYSTEM";
  pinned: boolean;
  created_at: string;
  author_email: string;
}

export default function UpdatesPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [eventData, setEventData] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Admin New Announcement Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newType, setNewType] = useState<Announcement["type"]>("ADMIN_ANNOUNCEMENT");
  const [newPinned, setNewPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Auth
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();
      if (meData.authenticated) {
        setCurrentUser(meData.user);
      }

      // Leaderboard / Event
      const eventRes = await fetch("/api/leaderboard");
      const eventData = await eventRes.json();
      if (eventData.event) setEventData(eventData.event);

      // Announcements
      const annRes = await fetch("/api/announcements");
      const annData = await annRes.json();
      if (annData.announcements) {
        setAnnouncements(annData.announcements);
      }
    } catch (err: any) {
      console.error("Updates load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          content: newContent.trim(),
          type: newType,
          pinned: newPinned,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);

      setShowCreateModal(false);
      setNewTitle("");
      setNewContent("");
      setNewPinned(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to create announcement.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;
    try {
      const res = await fetch(`/api/announcements?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch (err: any) {
      alert(err.message || "Failed to delete announcement.");
    }
  };

  const isAdmin = currentUser?.role === "admin";

  const filtered = announcements.filter((a) => {
    const matchesFilter = filterType === "ALL" || a.type === filterType;
    const matchesSearch =
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const pinnedList = filtered.filter((a) => a.pinned);
  const regularList = filtered.filter((a) => !a.pinned);

  const getTypeBadge = (type: Announcement["type"]) => {
    switch (type) {
      case "PHASE_CHANGE":
        return {
          label: "Phase Change",
          bg: "bg-red-500/10 text-red-400 border-red-500/30",
          icon: <Flag className="w-3 h-3" />,
        };
      case "DEADLINE":
        return {
          label: "Deadline",
          bg: "bg-amber-500/10 text-amber-400 border-amber-500/30",
          icon: <Clock className="w-3 h-3" />,
        };
      case "SYSTEM":
        return {
          label: "System Notice",
          bg: "bg-blue-500/10 text-blue-400 border-blue-500/30",
          icon: <AlertCircle className="w-3 h-3" />,
        };
      default:
        return {
          label: "Organizer Directive",
          bg: "bg-purple-500/10 text-purple-400 border-purple-500/30",
          icon: <Megaphone className="w-3 h-3" />,
        };
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-white flex flex-col relative selection:bg-red-600 selection:text-white">
      <Navbar currentUser={currentUser} eventStatus={eventData?.status} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-red-400 uppercase tracking-wider mb-1">
              <Megaphone className="w-4 h-4" />
              <span>Official Event Broadcast</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Event Updates & Bulletins
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1">
              Real-time schedule announcements, phase transitions, and organizer bulletins.
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

            {isAdmin && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-red-950/50 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Post Announcement</span>
              </button>
            )}
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="backdrop-blur-xl bg-black/60 border border-white/10 rounded-2xl p-4 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Type Filter */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "ALL", label: "All Updates" },
              { id: "PHASE_CHANGE", label: "Phase Changes" },
              { id: "ADMIN_ANNOUNCEMENT", label: "Directives" },
              { id: "DEADLINE", label: "Deadlines" },
              { id: "SYSTEM", label: "System" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filterType === tab.id
                    ? "bg-red-600 text-white shadow-md shadow-red-950/40"
                    : "text-neutral-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search updates..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-red-500"
            />
          </div>
        </div>

        {/* Content Stream */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-neutral-500 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mb-3" />
            <span>Loading bulletins...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="backdrop-blur-xl bg-black/40 border border-white/10 rounded-3xl p-12 text-center">
            <Megaphone className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">
              {searchQuery || filterType !== "ALL" ? "No announcements found" : "No announcements yet"}
            </h3>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto">
              {searchQuery
                ? `No updates matching "${searchQuery}".`
                : filterType !== "ALL"
                ? "There are currently no updates in this category."
                : "Official event bulletins and organizer directives will appear here."}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Pinned Section */}
            {pinnedList.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-red-400 uppercase tracking-wider">
                  <Pin className="w-3.5 h-3.5" />
                  <span>Important Directives (Pinned)</span>
                </div>
                <div className="space-y-4">
                  {pinnedList.map((ann) => {
                    const badge = getTypeBadge(ann.type);
                    return (
                      <div
                        key={ann.id}
                        className="backdrop-blur-xl bg-red-950/20 border border-red-500/40 rounded-3xl p-6 sm:p-7 shadow-xl transition-all relative group"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1.5 ${badge.bg}`}
                            >
                              {badge.icon}
                              {badge.label}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-red-600/30 text-red-300 border border-red-500/40 text-[10px] font-bold flex items-center gap-1">
                              <Pin className="w-2.5 h-2.5" />
                              PINNED
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-neutral-400">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-neutral-500" />
                              <span>{new Date(ann.created_at).toLocaleDateString()}</span>
                              <span className="text-neutral-600">•</span>
                              <span>{new Date(ann.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                            </div>

                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteAnnouncement(ann.id)}
                                title="Delete announcement"
                                className="text-neutral-500 hover:text-red-400 p-1 rounded cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <h2 className="text-lg sm:text-xl font-bold text-white mb-2">
                          {ann.title}
                        </h2>
                        <div className="text-xs sm:text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">
                          {ann.content}
                        </div>

                        <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-2 text-[10px] text-neutral-500">
                          <Shield className="w-3 h-3 text-red-400" />
                          <span>Published by Event Organizing Committee</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Regular Announcements */}
            <div className="space-y-4">
              {pinnedList.length > 0 && regularList.length > 0 && (
                <div className="flex items-center gap-2 text-xs font-bold text-neutral-400 uppercase tracking-wider pt-2">
                  <span>Chronological Updates</span>
                </div>
              )}
              {regularList.map((ann) => {
                const badge = getTypeBadge(ann.type);
                return (
                  <div
                    key={ann.id}
                    className="backdrop-blur-xl bg-black/60 border border-white/10 rounded-3xl p-6 sm:p-7 shadow-xl transition-all relative group hover:border-white/20"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                      <span
                        className={`self-start px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1.5 ${badge.bg}`}
                      >
                        {badge.icon}
                        {badge.label}
                      </span>

                      <div className="flex items-center gap-3 text-[11px] text-neutral-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-neutral-500" />
                          <span>{new Date(ann.created_at).toLocaleDateString()}</span>
                          <span className="text-neutral-600">•</span>
                          <span>{new Date(ann.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>

                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteAnnouncement(ann.id)}
                            title="Delete announcement"
                            className="text-neutral-500 hover:text-red-400 p-1 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <h2 className="text-lg font-bold text-white mb-2">
                      {ann.title}
                    </h2>
                    <div className="text-xs sm:text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">
                      {ann.content}
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-2 text-[10px] text-neutral-500">
                      <Shield className="w-3 h-3 text-neutral-400" />
                      <span>Published by Event Organizing Committee</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Create Announcement Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="backdrop-blur-xl bg-black/90 border border-white/20 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative">
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
                <div className="flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-red-500" />
                  <h3 className="text-lg font-bold text-white">Create Official Bulletin</h3>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-neutral-400 hover:text-white text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1">
                    Announcement Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Peer Voting is now Live"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-red-500 text-sm text-white placeholder-neutral-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1">
                    Bulletin Type
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-900 border border-white/10 focus:border-red-500 text-sm text-white outline-none"
                  >
                    <option value="ADMIN_ANNOUNCEMENT">Organizer Directive</option>
                    <option value="PHASE_CHANGE">Phase Change</option>
                    <option value="DEADLINE">Deadline Notice</option>
                    <option value="SYSTEM">System Notice</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1">
                    Content / Directives *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="Provide full details, guidelines, or instructions for participants..."
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-red-500 text-sm text-white placeholder-neutral-500 outline-none resize-none"
                  />
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-neutral-200">
                    <input
                      type="checkbox"
                      checked={newPinned}
                      onChange={(e) => setNewPinned(e.target.checked)}
                      className="rounded border-white/20 bg-black/40 text-red-600 focus:ring-0 cursor-pointer"
                    />
                    <span>Pin this announcement at the top of the feed</span>
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-red-950/50 cursor-pointer"
                  >
                    {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>Publish Announcement</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
