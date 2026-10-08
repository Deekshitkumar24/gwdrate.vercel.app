import fs from "fs";
import path from "path";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import {
  validateFinalRatings,
  validateDraftRatings,
  computeLeaderboard,
  computeDynamicProgress,
  RatingItem,
  LeaderboardEntry,
} from "@/lib/rules";
import { isMongoEnabled, loadStateFromMongo, saveStateToMongo } from "./mongo";

export type EventStatus =
  | "DRAFT"
  | "REGISTRATION_OPEN"
  | "REGISTRATION_CLOSED"
  | "VOTING_READY"
  | "VOTING_OPEN"
  | "VOTING_CLOSED"
  | "RESULTS_PUBLISHED"
  | "ARCHIVED"
  // Legacy aliases for backward compatibility:
  | "REGISTRATION"
  | "OPEN"
  | "CLOSED";

export type TeamStatus =
  | "PENDING"
  | "APPROVED"
  | "CHANGES_REQUESTED"
  | "REJECTED"
  | "DISQUALIFIED"
  | "WITHDRAWN";

export type RatingStatus = "DRAFT" | "FINAL";

export type LeaderboardVisibility = "HIDDEN" | "MEMBERS_ONLY" | "PUBLIC" | "FINAL";

export interface TeamMember {
  id: string;
  name: string;
  email?: string;
  role: string;
  is_leader: boolean;
  active: boolean;
}

export interface EventRecord {
  id: string;
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  status: EventStatus;
  leaderboard_visible: boolean;
  leaderboard_visibility?: LeaderboardVisibility;
  max_tens: number;
  min_teams: number;
  roster_frozen_at: string | null;
  is_results_published?: boolean;
  created_at: string;
}

export interface TeamRecord {
  id: string;
  event_id: string;
  code: string;
  name: string;
  leader_name: string;
  contact: string;
  leader_email?: string;
  institution?: string;
  description?: string;
  password_hash: string;
  status: TeamStatus;
  changes_requested_note?: string | null;
  registered_at: string;
  approved_at: string | null;
  submitted_at: string | null;
  members?: TeamMember[];
}

export interface RatingRecord {
  id: string;
  event_id: string;
  rater_team_id: string;
  target_team_id: string;
  score: number;
  status: RatingStatus;
  updated_at: string;
}

export interface CommunityMessage {
  id: string;
  event_id: string;
  author_id: string;
  author_name: string;
  author_team_code: string;
  author_role: "admin" | "leader" | "member";
  channel: "announcements" | "general" | "qa";
  content: string;
  is_announcement: boolean;
  is_pinned: boolean;
  created_at: string;
  reply_to_id?: string | null;
}

export interface EventAnnouncement {
  id: string;
  event_id: string;
  title: string;
  content: string;
  type: "SYSTEM" | "ADMIN_ANNOUNCEMENT" | "PHASE_CHANGE" | "DEADLINE";
  pinned: boolean;
  created_at: string;
}

export interface AuditRecord {
  id: number;
  timestamp: string;
  actor: string;
  action: string;
  detail: Record<string, unknown>;
}

export interface DatabaseState {
  event: EventRecord;
  teams: TeamRecord[];
  ratings: RatingRecord[];
  communityMessages?: CommunityMessage[];
  announcements?: EventAnnouncement[];
  auditLogs: AuditRecord[];
  admin: {
    email: string;
    password_hash: string;
  };
}

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "store.json");

let memoryState: DatabaseState | null = null;
let writeQueue = Promise.resolve();

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Creates a clean, production-ready initial database state with ZERO mock data.
 * No fake teams, no fake ratings, no fake messages, no fake announcements.
 */
function createInitialState(): DatabaseState {
  const eventId = "evt-gwd-2026";
  const adminPwHash = bcrypt.hashSync("admin1234", 10);

  return {
    event: {
      id: eventId,
      name: "ProjectGuard Live Event 2026",
      description: "Pre-deployment peer review and live rating platform.",
      status: "DRAFT",
      leaderboard_visible: false,
      leaderboard_visibility: "MEMBERS_ONLY",
      max_tens: 5,
      min_teams: 3,
      roster_frozen_at: null,
      created_at: new Date().toISOString(),
    },
    teams: [],
    ratings: [],
    communityMessages: [],
    announcements: [],
    auditLogs: [
      {
        id: 1,
        timestamp: new Date().toISOString(),
        actor: "SYSTEM",
        action: "EVENT_INITIALIZED",
        detail: { status: "DRAFT", mode: "ZERO_MOCK_PRODUCTION" },
      },
    ],
    admin: {
      email: "admin@gwd.com",
      password_hash: adminPwHash,
    },
  };
}

/**
 * Creates seed test data for automated testing suites only.
 */
function createTestSeedState(): DatabaseState {
  const eventId = "evt-gwd-2026";
  const defaultPwHash = bcrypt.hashSync("password123", 10);
  const adminPwHash = bcrypt.hashSync("admin1234", 10);

  const initialTeams: TeamRecord[] = [
    {
      id: "team-001",
      event_id: eventId,
      code: "T001",
      name: "Team Phoenix",
      leader_name: "Sarah Chen",
      contact: "+1 (555) 234-5678",
      leader_email: "sarah@phoenix.dev",
      institution: "MIT Media Lab",
      description: "Autonomous Web Agent Testing & Pre-Deployment QA Engine",
      password_hash: defaultPwHash,
      status: "APPROVED",
      registered_at: new Date(Date.now() - 3600000 * 5).toISOString(),
      approved_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      submitted_at: null, // Left unsubmitted for live user testing!
      members: [
        { id: "m-101", name: "Sarah Chen", email: "sarah@phoenix.dev", role: "Team Leader / Architecture", is_leader: true, active: true },
        { id: "m-102", name: "Alex Zhao", email: "alex@phoenix.dev", role: "Frontend Engineer", is_leader: false, active: true },
        { id: "m-103", name: "Maya Lin", email: "maya@phoenix.dev", role: "AI / ML Specialist", is_leader: false, active: true },
      ],
    },
    {
      id: "team-002",
      event_id: eventId,
      code: "T002",
      name: "Team CyberPulse",
      leader_name: "Marcus Vance",
      contact: "+1 (555) 345-6789",
      leader_email: "marcus@cyberpulse.io",
      institution: "Stanford Engineering",
      description: "Real-time Distributed Event Stream Consensus Protocol",
      password_hash: defaultPwHash,
      status: "APPROVED",
      registered_at: new Date(Date.now() - 3600000 * 5).toISOString(),
      approved_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      submitted_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      members: [
        { id: "m-201", name: "Marcus Vance", email: "marcus@cyberpulse.io", role: "Team Leader / Systems", is_leader: true, active: true },
        { id: "m-202", name: "Jordan Reed", email: "jordan@cyberpulse.io", role: "Backend Engineer", is_leader: false, active: true },
      ],
    },
    {
      id: "team-003",
      event_id: eventId,
      code: "T003",
      name: "Team Quantum Leap",
      leader_name: "Elena Rostova",
      contact: "+1 (555) 456-7890",
      leader_email: "elena@quantum.tech",
      institution: "ETH Zurich",
      description: "Low-latency Quantum Cryptographic Key Exchange Platform",
      password_hash: defaultPwHash,
      status: "APPROVED",
      registered_at: new Date(Date.now() - 3600000 * 5).toISOString(),
      approved_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      submitted_at: new Date(Date.now() - 3600000 * 1.5).toISOString(),
      members: [
        { id: "m-301", name: "Elena Rostova", email: "elena@quantum.tech", role: "Team Leader / Physics", is_leader: true, active: true },
        { id: "m-302", name: "Lucas Meyer", email: "lucas@quantum.tech", role: "Full Stack Dev", is_leader: false, active: true },
      ],
    },
    {
      id: "team-004",
      event_id: eventId,
      code: "T004",
      name: "Team Velocity",
      leader_name: "David Kim",
      contact: "+1 (555) 567-8901",
      leader_email: "david@velocity.org",
      institution: "UC Berkeley",
      description: "GPU-Accelerated Vector Graph Visualization Pipeline",
      password_hash: defaultPwHash,
      status: "APPROVED",
      registered_at: new Date(Date.now() - 3600000 * 5).toISOString(),
      approved_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      submitted_at: new Date(Date.now() - 3600000 * 1).toISOString(),
      members: [
        { id: "m-401", name: "David Kim", email: "david@velocity.org", role: "Team Leader / Graphics", is_leader: true, active: true },
      ],
    },
    {
      id: "team-005",
      event_id: eventId,
      code: "T005",
      name: "Team Apex Studio",
      leader_name: "Priya Patel",
      contact: "+1 (555) 678-9012",
      leader_email: "priya@apex.co",
      institution: "Carnegie Mellon",
      description: "High-Frequency Automated Release Decision Platform",
      password_hash: defaultPwHash,
      status: "APPROVED",
      registered_at: new Date(Date.now() - 3600000 * 5).toISOString(),
      approved_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      submitted_at: new Date(Date.now() - 3600000 * 0.8).toISOString(),
      members: [
        { id: "m-501", name: "Priya Patel", email: "priya@apex.co", role: "Team Leader / Product", is_leader: true, active: true },
        { id: "m-502", name: "Rohan Varma", email: "rohan@apex.co", role: "QA Engineer", is_leader: false, active: true },
      ],
    },
    {
      id: "team-006",
      event_id: eventId,
      code: "T006",
      name: "Team Nova Core",
      leader_name: "Liam O'Connor",
      contact: "+1 (555) 789-0123",
      leader_email: "liam@novacore.ai",
      institution: "Trinity College Dublin",
      description: "Adaptive Peer-Review Consensus & Ranking Framework",
      password_hash: defaultPwHash,
      status: "APPROVED",
      registered_at: new Date(Date.now() - 3600000 * 5).toISOString(),
      approved_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      submitted_at: null,
      members: [
        { id: "m-601", name: "Liam O'Connor", email: "liam@novacore.ai", role: "Team Leader", is_leader: true, active: true },
      ],
    },
    {
      id: "team-007",
      event_id: eventId,
      code: "T007",
      name: "Team Titan Dynamics",
      leader_name: "Amina Al-Mansoor",
      contact: "+1 (555) 890-1234",
      leader_email: "amina@titandyn.com",
      institution: "Oxford University",
      description: "Formal Verification & Smart Contract Static Audit Tool",
      password_hash: defaultPwHash,
      status: "APPROVED",
      registered_at: new Date(Date.now() - 3600000 * 5).toISOString(),
      approved_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      submitted_at: null,
      members: [
        { id: "m-701", name: "Amina Al-Mansoor", email: "amina@titandyn.com", role: "Team Leader", is_leader: true, active: true },
      ],
    },
    {
      id: "team-008",
      event_id: eventId,
      code: "T008",
      name: "Team Hyperion",
      leader_name: "Alex Rivera",
      contact: "+1 (555) 901-2345",
      leader_email: "alex@hyperion.xyz",
      institution: "Georgia Tech",
      description: "Multi-Agent Automated Synthetic Testing Sandbox",
      password_hash: defaultPwHash,
      status: "APPROVED",
      registered_at: new Date(Date.now() - 3600000 * 5).toISOString(),
      approved_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      submitted_at: null,
      members: [
        { id: "m-801", name: "Alex Rivera", email: "alex@hyperion.xyz", role: "Team Leader", is_leader: true, active: true },
      ],
    },
  ];

  // Seed realistic submitted ratings for T002, T003, T004, T005
  const initialRatings: RatingRecord[] = [];
  const submittedRaters = [initialTeams[1], initialTeams[2], initialTeams[3], initialTeams[4]];

  for (const rater of submittedRaters) {
    const targets = initialTeams.filter((t) => t.id !== rater.id);
    let tensGiven = 0;
    targets.forEach((target, idx) => {
      let score = 7;
      if (idx === 0 && tensGiven < 3) {
        score = 10;
        tensGiven++;
      } else if (idx === 1 && tensGiven < 3) {
        score = 10;
        tensGiven++;
      } else if (idx % 2 === 0) {
        score = 9;
      } else {
        score = 8;
      }

      initialRatings.push({
        id: generateId(),
        event_id: eventId,
        rater_team_id: rater.id,
        target_team_id: target.id,
        score,
        status: "FINAL",
        updated_at: rater.submitted_at!,
      });
    });
  }

  return {
    event: {
      id: eventId,
      name: "GWD Live Event Hackathon 2026",
      status: "OPEN",
      leaderboard_visible: true,
      max_tens: 5,
      min_teams: 3,
      roster_frozen_at: new Date(Date.now() - 3600000 * 3).toISOString(),
      created_at: new Date(Date.now() - 3600000 * 10).toISOString(),
    },
    teams: initialTeams,
    ratings: initialRatings,
    auditLogs: [
      {
        id: 1,
        timestamp: new Date(Date.now() - 3600000 * 10).toISOString(),
        actor: "admin@gwd.com",
        action: "EVENT_CREATED",
        detail: { name: "GWD Live Event Hackathon 2026", max_tens: 5 },
      },
      {
        id: 2,
        timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
        actor: "admin@gwd.com",
        action: "ROSTER_FROZEN",
        detail: { teamCount: 8 },
      },
      {
        id: 3,
        timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
        actor: "admin@gwd.com",
        action: "STATUS_CHANGE",
        detail: { oldStatus: "REGISTRATION", newStatus: "OPEN" },
      },
      {
        id: 4,
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        actor: "T002",
        action: "SUBMIT",
        detail: { targetsRated: 7, tensUsed: 2 },
      },
      {
        id: 5,
        timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString(),
        actor: "T003",
        action: "SUBMIT",
        detail: { targetsRated: 7, tensUsed: 2 },
      },
    ],
    communityMessages: [
      {
        id: "msg-001",
        event_id: eventId,
        author_id: "admin",
        author_name: "Event Organizer",
        author_team_code: "ADMIN",
        author_role: "admin",
        channel: "announcements",
        content: "Welcome teams to the GWD 2026 Live Hackathon & Rating Arena! Please review the evaluation guidelines and test your team credentials.",
        is_announcement: true,
        is_pinned: true,
        created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
      },
      {
        id: "msg-002",
        event_id: eventId,
        author_id: "team-001",
        author_name: "Sarah Chen",
        author_team_code: "T001",
        author_role: "leader",
        channel: "general",
        content: "Team Phoenix is all set and ready! Looking forward to reviewing the peer demos.",
        is_announcement: false,
        is_pinned: false,
        created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
      },
      {
        id: "msg-003",
        event_id: eventId,
        author_id: "team-002",
        author_name: "Marcus Vance",
        author_team_code: "T002",
        author_role: "leader",
        channel: "qa",
        content: "Quick question: does the 5-ten rule reset if we change a 10 to a 9 before final submission? (Confirmed: yes it releases the slot!)",
        is_announcement: false,
        is_pinned: false,
        created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
    ],
    announcements: [
      {
        id: "ann-001",
        event_id: eventId,
        title: "Peer-to-Peer Evaluation Round is LIVE",
        content: "Voting is officially open! Each participating team must rate all eligible peers from 1 to 10 with a maximum of five 10-ratings.",
        type: "PHASE_CHANGE",
        pinned: true,
        created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
      },
      {
        id: "ann-002",
        event_id: eventId,
        title: "Submission Lockdown Warning",
        content: "Ballots are final once submitted. Please verify all scores using the Review Screen before confirming.",
        type: "DEADLINE",
        pinned: false,
        created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
    ],
    admin: {
      email: "admin@gwd.com",
      password_hash: adminPwHash,
    },
  };
}

function loadState(): DatabaseState {
  if (memoryState) return memoryState;

  ensureDataDir();
  if (fs.existsSync(DATA_FILE)) {
    try {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      memoryState = JSON.parse(raw);
      if (memoryState) {
        if (!memoryState.communityMessages) memoryState.communityMessages = [];
        if (!memoryState.announcements) memoryState.announcements = [];
        for (const t of memoryState.teams || []) {
          if (!t.members || t.members.length === 0) {
            t.members = [
              {
                id: `m-${t.code}`,
                name: t.leader_name,
                email: t.contact,
                role: "Team Leader",
                is_leader: true,
                active: true,
              },
            ];
          }
        }
        return memoryState;
      }
    } catch (e) {
      console.error("Failed to read store.json, resetting to seed data:", e);
    }
  }

  memoryState = createInitialState();
  saveStateSync(memoryState);
  return memoryState;
}

function saveStateSync(state: DatabaseState) {
  ensureDataDir();
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (err) {
    console.error("Database write error:", err);
  }
}

function persistState(): Promise<void> {
  writeQueue = writeQueue.then(async () => {
    if (memoryState) {
      saveStateSync(memoryState);
      if (isMongoEnabled()) {
        try {
          await saveStateToMongo(memoryState);
        } catch (e) {
          console.error("MongoDB persist error:", e);
        }
      }
    }
  });
  return writeQueue;
}

export class Database {
  static async ensureSynced(): Promise<DatabaseState> {
    if (!isMongoEnabled()) {
      return loadState();
    }
    try {
      const mongoState = await loadStateFromMongo();
      if (mongoState) {
        memoryState = mongoState;
      } else {
        const local = loadState();
        await saveStateToMongo(local);
      }
    } catch (e) {
      console.warn("MongoDB sync fallback to local/memory:", e);
    }
    return loadState();
  }

  static getEvent(): EventRecord {
    return loadState().event;
  }

  static async updateEvent(
    updates: Partial<EventRecord>,
    actor: string
  ): Promise<EventRecord> {
    const state = loadState();
    const oldStatus = state.event.status;
    state.event = { ...state.event, ...updates };

    await this.recordAudit(actor, "EVENT_UPDATED", {
      updates,
      oldStatus,
      newStatus: state.event.status,
    });
    await persistState();
    return state.event;
  }

  static async freezeRoster(actor: string): Promise<EventRecord> {
    const state = loadState();
    const approvedTeams = state.teams.filter((t) => t.status === "APPROVED");
    if (approvedTeams.length < state.event.min_teams) {
      throw new Error(`ROSTER_NOT_FROZEN: Minimum ${state.event.min_teams} approved teams required.`);
    }

    state.event.roster_frozen_at = new Date().toISOString();
    await this.recordAudit(actor, "ROSTER_FROZEN", {
      approvedTeamCount: approvedTeams.length,
      frozenAt: state.event.roster_frozen_at,
    });
    await persistState();
    return state.event;
  }

  static getTeams(): TeamRecord[] {
    return loadState().teams;
  }

  static getTeamById(id: string): TeamRecord | undefined {
    return loadState().teams.find((t) => t.id === id);
  }

  static getTeamByCode(code: string): TeamRecord | undefined {
    return loadState().teams.find(
      (t) => t.code.trim().toUpperCase() === code.trim().toUpperCase()
    );
  }

  static async registerTeam(data: {
    name: string;
    leader_name: string;
    contact: string;
    password: string;
    leader_email?: string;
    institution?: string;
    description?: string;
    members?: Array<{ name: string; role?: string; email?: string }>;
  }): Promise<{ team: TeamRecord; code: string }> {
    const state = loadState();

    const isRegOpen =
      state.event.status === "REGISTRATION" ||
      state.event.status === "REGISTRATION_OPEN";
    if (!isRegOpen) {
      throw new Error("REGISTRATION_CLOSED");
    }

    const trimmedName = data.name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 50) {
      throw new Error("INVALID_NAME_LENGTH");
    }

    const nameExists = state.teams.some(
      (t) => t.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (nameExists) {
      throw new Error("TEAM_NAME_TAKEN");
    }

    if (data.password.length < 8) {
      throw new Error("PASSWORD_TOO_SHORT");
    }

    // Generate unique, readable code like T009 or T-101
    const count = state.teams.length + 1;
    const code = `T${String(count).padStart(3, "0")}`;
    const password_hash = bcrypt.hashSync(data.password, 10);

    const initialMembers: TeamMember[] = [
      {
        id: generateId(),
        name: data.leader_name.trim(),
        email: data.leader_email?.trim() || data.contact.trim(),
        role: "Team Leader",
        is_leader: true,
        active: true,
      },
    ];

    if (data.members && Array.isArray(data.members)) {
      for (const m of data.members) {
        if (m.name && m.name.trim()) {
          initialMembers.push({
            id: generateId(),
            name: m.name.trim(),
            email: m.email?.trim(),
            role: m.role?.trim() || "Member",
            is_leader: false,
            active: true,
          });
        }
      }
    }

    const newTeam: TeamRecord = {
      id: generateId(),
      event_id: state.event.id,
      code,
      name: trimmedName,
      leader_name: data.leader_name.trim(),
      contact: data.contact.trim(),
      leader_email: data.leader_email?.trim() || data.contact.trim(),
      institution: data.institution?.trim() || "",
      description: data.description?.trim() || "",
      password_hash,
      status: "PENDING",
      registered_at: new Date().toISOString(),
      approved_at: null,
      submitted_at: null,
      members: initialMembers,
    };

    state.teams.push(newTeam);
    await this.recordAudit(code, "TEAM_REGISTERED", {
      name: newTeam.name,
      leader: newTeam.leader_name,
      membersCount: initialMembers.length,
    });
    await persistState();

    return { team: newTeam, code };
  }

  static async requestChangesTeam(
    teamId: string,
    note: string,
    actor: string
  ): Promise<TeamRecord> {
    const state = loadState();
    const team = state.teams.find((t) => t.id === teamId);
    if (!team) throw new Error("TEAM_NOT_FOUND");

    team.status = "CHANGES_REQUESTED";
    team.changes_requested_note = note;
    await this.recordAudit(actor, "TEAM_CHANGES_REQUESTED", {
      teamCode: team.code,
      note,
    });
    await persistState();
    return team;
  }

  static async updateTeamRegistration(
    teamId: string,
    updates: Partial<TeamRecord>,
    actor: string
  ): Promise<TeamRecord> {
    const state = loadState();
    const team = state.teams.find((t) => t.id === teamId);
    if (!team) throw new Error("TEAM_NOT_FOUND");

    if (updates.name && updates.name !== team.name) {
      const nameExists = state.teams.some(
        (t) => t.id !== teamId && t.name.toLowerCase() === updates.name!.trim().toLowerCase()
      );
      if (nameExists) throw new Error("TEAM_NAME_TAKEN");
      team.name = updates.name.trim();
    }

    if (updates.leader_name) team.leader_name = updates.leader_name.trim();
    if (updates.contact) team.contact = updates.contact.trim();
    if (updates.leader_email) team.leader_email = updates.leader_email.trim();
    if (updates.institution !== undefined) team.institution = updates.institution;
    if (updates.description !== undefined) team.description = updates.description;
    if (updates.members) team.members = updates.members;

    if (team.status === "CHANGES_REQUESTED") {
      team.status = "PENDING";
      team.changes_requested_note = null;
    }

    await this.recordAudit(actor, "TEAM_UPDATED", { teamCode: team.code });
    await persistState();
    return team;
  }

  static async addTeamMember(
    teamId: string,
    member: { name: string; role?: string; email?: string; is_leader?: boolean },
    actor: string
  ): Promise<TeamMember> {
    const state = loadState();
    const team = state.teams.find((t) => t.id === teamId);
    if (!team) throw new Error("TEAM_NOT_FOUND");

    if (!team.members) {
      team.members = [
        {
          id: generateId(),
          name: team.leader_name,
          email: team.leader_email || team.contact,
          role: "Team Leader",
          is_leader: true,
          active: true,
        },
      ];
    }

    const newMember: TeamMember = {
      id: generateId(),
      name: member.name.trim(),
      email: member.email?.trim(),
      role: member.role?.trim() || "Member",
      is_leader: Boolean(member.is_leader),
      active: true,
    };

    team.members.push(newMember);
    await this.recordAudit(actor, "MEMBER_ADDED", {
      teamCode: team.code,
      memberName: newMember.name,
      role: newMember.role,
    });
    await persistState();
    return newMember;
  }

  static async removeTeamMember(
    teamId: string,
    memberId: string,
    actor: string
  ): Promise<void> {
    const state = loadState();
    const team = state.teams.find((t) => t.id === teamId);
    if (!team || !team.members) throw new Error("TEAM_NOT_FOUND");

    const member = team.members.find((m) => m.id === memberId);
    if (member?.is_leader) {
      throw new Error("CANNOT_REMOVE_LEADER");
    }

    team.members = team.members.filter((m) => m.id !== memberId);
    await this.recordAudit(actor, "MEMBER_REMOVED", { teamCode: team.code, memberId });
    await persistState();
  }

  static async updateTeamMember(
    teamId: string,
    memberId: string,
    updates: Partial<TeamMember>,
    actor: string
  ): Promise<TeamMember> {
    const state = loadState();
    const team = state.teams.find((t) => t.id === teamId);
    if (!team || !team.members) throw new Error("TEAM_NOT_FOUND");

    const member = team.members.find((m) => m.id === memberId);
    if (!member) throw new Error("MEMBER_NOT_FOUND");

    if (updates.name) member.name = updates.name.trim();
    if (updates.role) member.role = updates.role.trim();
    if (updates.email !== undefined) member.email = updates.email?.trim();
    if (updates.active !== undefined) member.active = updates.active;

    await this.recordAudit(actor, "MEMBER_UPDATED", { teamCode: team.code, memberId });
    await persistState();
    return member;
  }

  static async addTeam(
    data: {
      name: string;
      leader_name: string;
      contact: string;
      password?: string;
      status?: TeamStatus;
    },
    actor: string
  ): Promise<TeamRecord> {
    const state = loadState();
    const count = state.teams.length + 1;
    const code = `T${String(count).padStart(3, "0")}`;
    const rawPw = data.password || "password123";
    const password_hash = bcrypt.hashSync(rawPw, 10);

    const newTeam: TeamRecord = {
      id: generateId(),
      event_id: state.event.id,
      code,
      name: data.name.trim(),
      leader_name: data.leader_name.trim() || "Team Leader",
      contact: data.contact.trim() || "team@event.local",
      password_hash,
      status: data.status || "APPROVED",
      registered_at: new Date().toISOString(),
      approved_at: data.status === "APPROVED" ? new Date().toISOString() : null,
      submitted_at: null,
    };

    state.teams.push(newTeam);
    await this.recordAudit(actor, "TEAM_ADDED", { code, name: newTeam.name });
    await persistState();
    return newTeam;
  }

  static async approveTeam(teamId: string, actor: string): Promise<TeamRecord> {
    const state = loadState();
    const team = state.teams.find((t) => t.id === teamId);
    if (!team) throw new Error("TEAM_NOT_FOUND");

    team.status = "APPROVED";
    team.approved_at = new Date().toISOString();

    await this.recordAudit(actor, "TEAM_APPROVED", { teamCode: team.code });
    await persistState();
    return team;
  }

  static async rejectTeam(
    teamId: string,
    reason: string,
    actor: string
  ): Promise<TeamRecord> {
    const state = loadState();
    const team = state.teams.find((t) => t.id === teamId);
    if (!team) throw new Error("TEAM_NOT_FOUND");

    team.status = "REJECTED";
    await this.recordAudit(actor, "TEAM_REJECTED", {
      teamCode: team.code,
      reason,
    });
    await persistState();
    return team;
  }

  static async disqualifyTeam(
    teamId: string,
    newStatus: "DISQUALIFIED" | "WITHDRAWN" | "APPROVED",
    actor: string
  ): Promise<TeamRecord> {
    const state = loadState();
    const team = state.teams.find((t) => t.id === teamId);
    if (!team) throw new Error("TEAM_NOT_FOUND");

    const oldStatus = team.status;
    team.status = newStatus;

    await this.recordAudit(actor, "TEAM_STATUS_CHANGE", {
      teamCode: team.code,
      oldStatus,
      newStatus,
    });
    await persistState();
    return team;
  }

  static async unlockTeam(teamId: string, actor: string): Promise<TeamRecord> {
    const state = loadState();
    const team = state.teams.find((t) => t.id === teamId);
    if (!team) throw new Error("TEAM_NOT_FOUND");

    team.submitted_at = null;
    // Switch final ratings back to draft so team can edit
    for (const r of state.ratings) {
      if (r.rater_team_id === teamId) {
        r.status = "DRAFT";
      }
    }

    await this.recordAudit(actor, "TEAM_UNLOCKED", { teamCode: team.code });
    await persistState();
    return team;
  }

  static async resetTeamPassword(
    teamId: string,
    newPassword: string,
    actor: string
  ): Promise<void> {
    const state = loadState();
    const team = state.teams.find((t) => t.id === teamId);
    if (!team) throw new Error("TEAM_NOT_FOUND");

    team.password_hash = bcrypt.hashSync(newPassword, 10);
    await this.recordAudit(actor, "PASSWORD_RESET", { teamCode: team.code });
    await persistState();
  }

  static async importTeams(
    teamsData: Array<{ name: string; leader_name?: string; contact?: string }>,
    actor: string
  ): Promise<TeamRecord[]> {
    const state = loadState();
    const imported: TeamRecord[] = [];
    const defaultPwHash = bcrypt.hashSync("password123", 10);

    for (const item of teamsData) {
      const name = item.name.trim();
      if (!name) continue;
      const count = state.teams.length + 1;
      const code = `T${String(count).padStart(3, "0")}`;

      const newTeam: TeamRecord = {
        id: generateId(),
        event_id: state.event.id,
        code,
        name,
        leader_name: item.leader_name?.trim() || "Team Leader",
        contact: item.contact?.trim() || "team@event.local",
        password_hash: defaultPwHash,
        status: "APPROVED",
        registered_at: new Date().toISOString(),
        approved_at: new Date().toISOString(),
        submitted_at: null,
      };

      state.teams.push(newTeam);
      imported.push(newTeam);
    }

    await this.recordAudit(actor, "TEAMS_IMPORTED", { count: imported.length });
    await persistState();
    return imported;
  }

  /**
   * Returns list of eligible target teams for the current team.
   * Excludes the rater team itself (R2) and excludes disqualified/withdrawn teams.
   */
  static getEligibleTargets(currentTeamId: string): TeamRecord[] {
    const state = loadState();
    return state.teams.filter(
      (t) => t.status === "APPROVED" && t.id !== currentTeamId
    );
  }

  /**
   * Returns current ratings (draft or final) for a given rater team.
   */
  static getRatingsForTeam(teamId: string): RatingRecord[] {
    const state = loadState();
    return state.ratings.filter((r) => r.rater_team_id === teamId);
  }

  /**
   * Autosaves draft ratings.
   * Never affects the leaderboard.
   */
  static async saveDraft(
    raterTeamId: string,
    ratings: RatingItem[],
    actor: string
  ): Promise<{ saved: number; tensUsed: number }> {
    const state = loadState();
    const team = state.teams.find((t) => t.id === raterTeamId);
    if (!team) throw new Error("UNAUTHORIZED");
    if (team.submitted_at) throw new Error("ALREADY_SUBMITTED");
    if (state.event.status !== "OPEN" && state.event.status !== "VOTING_OPEN") {
      throw new Error("EVENT_NOT_OPEN");
    }

    const targets = this.getEligibleTargets(raterTeamId);
    const targetIds = targets.map((t) => t.id);

    const validation = validateDraftRatings(
      raterTeamId,
      ratings,
      targetIds,
      state.event.max_tens
    );
    if (!validation.valid) {
      throw new Error(validation.code || "INVALID_DRAFT");
    }

    // Upsert draft ratings
    const now = new Date().toISOString();
    for (const item of ratings) {
      const existing = state.ratings.find(
        (r) =>
          r.rater_team_id === raterTeamId && r.target_team_id === item.targetTeamId
      );
      if (existing) {
        existing.score = item.score;
        existing.status = "DRAFT";
        existing.updated_at = now;
      } else {
        state.ratings.push({
          id: generateId(),
          event_id: state.event.id,
          rater_team_id: raterTeamId,
          target_team_id: item.targetTeamId,
          score: item.score,
          status: "DRAFT",
          updated_at: now,
        });
      }
    }

    await persistState();
    const currentTeamRatings = state.ratings.filter((r) => r.rater_team_id === raterTeamId);
    const tensUsed = currentTeamRatings.filter((r) => r.score === 10).length;

    return { saved: ratings.length, tensUsed };
  }

  /**
   * Atomically submits final ratings for a team.
   * Follows the 15-step submission pipeline strictly!
   */
  static async submitFinalRatings(
    raterTeamId: string,
    ratings: RatingItem[],
    actor: string
  ): Promise<{ success: boolean; leaderboard: LeaderboardEntry[] }> {
    const state = loadState();
    const event = state.event;

    // 1. Authenticate check: raterTeamId must exist
    const team = state.teams.find((t) => t.id === raterTeamId);
    if (!team) throw new Error("UNAUTHORIZED");

    // 2. Event OPEN check
    if (event.status !== "OPEN" && event.status !== "VOTING_OPEN") {
      throw new Error("EVENT_NOT_OPEN");
    }

    // 3. Team is active & approved
    if (team.status !== "APPROVED") {
      throw new Error("NOT_APPROVED");
    }

    // 4. Team has not already submitted
    if (team.submitted_at) {
      throw new Error("ALREADY_SUBMITTED");
    }

    // 5. Determine eligible targets
    const eligibleTargets = this.getEligibleTargets(raterTeamId);
    const eligibleTargetIds = eligibleTargets.map((t) => t.id);

    // 6-11. Strict validation (no self-rating, all targets rated, 1-10 integer, max tens <= 5)
    const validation = validateFinalRatings(
      raterTeamId,
      ratings,
      eligibleTargetIds,
      event.max_tens
    );
    if (!validation.valid) {
      throw new Error(validation.code || "VALIDATION_FAILED");
    }

    // 12. Persist all ratings atomically
    const now = new Date().toISOString();
    // Remove old drafts for this rater
    state.ratings = state.ratings.filter((r) => r.rater_team_id !== raterTeamId);

    for (const item of ratings) {
      state.ratings.push({
        id: generateId(),
        event_id: event.id,
        rater_team_id: raterTeamId,
        target_team_id: item.targetTeamId,
        score: item.score,
        status: "FINAL",
        updated_at: now,
      });
    }

    // 13. Lock submission
    team.submitted_at = now;

    // 14. Recalculate leaderboard
    const finalLeaderboard = this.getLeaderboard();

    // 15. Record audit trail
    await this.recordAudit(actor, "SUBMIT", {
      targetsRated: ratings.length,
      tensUsed: ratings.filter((r) => r.score === 10).length,
    });

    await persistState();
    return { success: true, leaderboard: finalLeaderboard };
  }

  /**
   * Computes the live leaderboard.
   */
  static getLeaderboard(): LeaderboardEntry[] {
    const state = loadState();
    const finalRatings = state.ratings
      .filter((r) => r.status === "FINAL")
      .map((r) => ({
        raterTeamId: r.rater_team_id,
        targetTeamId: r.target_team_id,
        score: r.score,
      }));

    return computeLeaderboard(state.teams, finalRatings);
  }

  /**
   * Submission progress across all active teams.
   */
  static getSubmissionProgress() {
    const state = loadState();
    const approvedTeams = state.teams.filter((t) => t.status === "APPROVED");
    const totalActive = approvedTeams.length;
    const submittedCount = approvedTeams.filter((t) => t.submitted_at !== null).length;
    const remainingCount = totalActive - submittedCount;
    const percentage = totalActive > 0 ? Math.round((submittedCount / totalActive) * 100) : 0;
    const isComplete = totalActive > 0 && submittedCount === totalActive;

    return {
      totalActive,
      submittedCount,
      remainingCount,
      percentage,
      isComplete,
    };
  }

  static getAuditLogs(): AuditRecord[] {
    return loadState().auditLogs.slice().reverse();
  }

  static async recordAudit(
    actor: string,
    action: string,
    detail: Record<string, unknown>
  ): Promise<void> {
    const state = loadState();
    const record: AuditRecord = {
      id: state.auditLogs.length + 1,
      timestamp: new Date().toISOString(),
      actor,
      action,
      detail,
    };
    state.auditLogs.push(record);
  }

  static getCommunityMessages(channel?: string): CommunityMessage[] {
    const state = loadState();
    const msgs = state.communityMessages || [];
    if (channel && channel !== "all") {
      return msgs.filter((m) => m.channel === channel);
    }
    return msgs;
  }

  static async postCommunityMessage(
    data: Omit<CommunityMessage, "id" | "created_at">
  ): Promise<CommunityMessage> {
    const state = loadState();
    if (!state.communityMessages) state.communityMessages = [];

    const newMsg: CommunityMessage = {
      id: generateId(),
      event_id: state.event.id,
      author_id: data.author_id,
      author_name: data.author_name,
      author_team_code: data.author_team_code,
      author_role: data.author_role,
      channel: data.channel || "general",
      content: data.content.trim(),
      is_announcement: Boolean(data.is_announcement),
      is_pinned: Boolean(data.is_pinned),
      created_at: new Date().toISOString(),
      reply_to_id: data.reply_to_id || null,
    };

    state.communityMessages.push(newMsg);
    await persistState();
    return newMsg;
  }

  static async deleteCommunityMessage(messageId: string, actor: string): Promise<void> {
    const state = loadState();
    if (!state.communityMessages) return;
    state.communityMessages = state.communityMessages.filter((m) => m.id !== messageId);
    await this.recordAudit(actor, "COMMUNITY_MESSAGE_DELETED", { messageId });
    await persistState();
  }

  static async pinCommunityMessage(
    messageId: string,
    isPinned: boolean,
    actor: string
  ): Promise<void> {
    const state = loadState();
    if (!state.communityMessages) return;
    const msg = state.communityMessages.find((m) => m.id === messageId);
    if (msg) {
      msg.is_pinned = isPinned;
      await this.recordAudit(actor, "COMMUNITY_MESSAGE_PINNED", { messageId, isPinned });
      await persistState();
    }
  }

  static getAnnouncements(): EventAnnouncement[] {
    const state = loadState();
    return (state.announcements || []).slice().reverse();
  }

  static async postAnnouncement(
    data: Omit<EventAnnouncement, "id" | "created_at">,
    actor: string
  ): Promise<EventAnnouncement> {
    const state = loadState();
    if (!state.announcements) state.announcements = [];

    const announcement: EventAnnouncement = {
      id: generateId(),
      event_id: state.event.id,
      title: data.title.trim(),
      content: data.content.trim(),
      type: data.type || "ADMIN_ANNOUNCEMENT",
      pinned: Boolean(data.pinned),
      created_at: new Date().toISOString(),
    };

    state.announcements.push(announcement);
    await this.recordAudit(actor, "ANNOUNCEMENT_POSTED", { title: announcement.title });
    await persistState();
    return announcement;
  }

  static async deleteAnnouncement(id: string, actor: string): Promise<void> {
    const state = loadState();
    if (!state.announcements) return;
    state.announcements = state.announcements.filter((a) => a.id !== id);
    await this.recordAudit(actor, "ANNOUNCEMENT_DELETED", { id });
    await persistState();
  }

  static async configureEvent(
    config: {
      name?: string;
      description?: string;
      start_date?: string;
      end_date?: string;
      min_teams?: number;
      max_tens?: number;
      leaderboard_visibility?: LeaderboardVisibility;
      is_results_published?: boolean;
    },
    actor: string
  ): Promise<EventRecord> {
    const state = loadState();
    if (config.name) state.event.name = config.name.trim();
    if (config.description !== undefined) state.event.description = config.description;
    if (config.start_date !== undefined) state.event.start_date = config.start_date;
    if (config.end_date !== undefined) state.event.end_date = config.end_date;
    if (config.min_teams !== undefined) state.event.min_teams = config.min_teams;
    if (config.max_tens !== undefined) state.event.max_tens = config.max_tens;
    if (config.leaderboard_visibility !== undefined) {
      state.event.leaderboard_visibility = config.leaderboard_visibility;
      state.event.leaderboard_visible = config.leaderboard_visibility !== "HIDDEN";
    }
    if (config.is_results_published !== undefined) {
      state.event.is_results_published = config.is_results_published;
    }

    await this.recordAudit(actor, "EVENT_CONFIG_UPDATED", { config });
    await persistState();
    return state.event;
  }

  static async resetCleanState(actor: string = "admin@gwd.com"): Promise<void> {
    memoryState = createInitialState();
    await this.recordAudit(actor, "RESET_CLEAN_DATABASE", { zeroMockData: true });
    await persistState();
  }

  static async seedTestDataset(): Promise<void> {
    memoryState = createTestSeedState();
    await persistState();
  }

  static async resetDemoData(): Promise<void> {
    memoryState = createInitialState();
    await persistState();
  }
}
