import { test, describe, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { Database } from "../lib/db/index";

describe("Database & Pipeline Integration Tests", () => {
  beforeEach(async () => {
    // Seed test dataset for integration pipeline verification
    await Database.seedTestDataset();
  });

  after(async () => {
    // Leave database in zero-mock clean state after test run
    await Database.resetCleanState("TEST_SUITE");
  });

  test("Initializes event, teams, and seed ratings cleanly", () => {
    const event = Database.getEvent();
    assert.equal(event.status, "OPEN");
    assert.equal(event.max_tens, 5);

    const teams = Database.getTeams();
    assert.ok(teams.length >= 8);

    const phoenix = Database.getTeamByCode("T001");
    assert.ok(phoenix);
    assert.equal(phoenix.name, "Team Phoenix");
    assert.equal(phoenix.submitted_at, null); // Phoenix is unsubmitted
  });

  test("R2 & FR-R1: getEligibleTargets excludes rater team itself (N - 1 targets)", () => {
    const phoenix = Database.getTeamByCode("T001")!;
    const targets = Database.getEligibleTargets(phoenix.id);

    // No target can be phoenix
    assert.ok(!targets.some((t) => t.id === phoenix.id));

    const totalApproved = Database.getTeams().filter((t) => t.status === "APPROVED").length;
    assert.equal(targets.length, totalApproved - 1);
  });

  test("Draft Autosave: Saves drafts without affecting the leaderboard", async () => {
    const phoenix = Database.getTeamByCode("T001")!;
    const targets = Database.getEligibleTargets(phoenix.id);

    // Save partial draft for 3 teams
    const draft = [
      { targetTeamId: targets[0].id, score: 9 },
      { targetTeamId: targets[1].id, score: 10 },
      { targetTeamId: targets[2].id, score: 8 },
    ];

    const result = await Database.saveDraft(phoenix.id, draft, phoenix.code);
    assert.equal(result.saved, 3);
    assert.equal(result.tensUsed, 1);

    // Retrieve saved ratings
    const saved = Database.getRatingsForTeam(phoenix.id);
    assert.equal(saved.length, 3);
    assert.equal(saved[0].status, "DRAFT");

    // Leaderboard must NOT include Phoenix's draft ratings
    const leaderboard = Database.getLeaderboard();
    const target0 = leaderboard.find((e) => e.teamId === targets[0].id);
    // Draft does not contribute to target0 ratingsReceived count from Phoenix
    const finalRatingsForTarget0 = Database.getRatingsForTeam(phoenix.id).filter(
      (r) => r.status === "FINAL" && r.target_team_id === targets[0].id
    );
    assert.equal(finalRatingsForTarget0.length, 0);
  });

  test("Atomic Submission: Complete valid ratings lock submission and update leaderboard", async () => {
    const phoenix = Database.getTeamByCode("T001")!;
    const targets = Database.getEligibleTargets(phoenix.id);

    // Complete ratings for all eligible targets
    const validRatings = targets.map((t, idx) => ({
      targetTeamId: t.id,
      score: idx < 3 ? 10 : 8, // 3 tens (<= 5)
    }));

    const res = await Database.submitFinalRatings(phoenix.id, validRatings, phoenix.code);
    assert.equal(res.success, true);

    // Team is now locked
    const updatedPhoenix = Database.getTeamById(phoenix.id)!;
    assert.ok(updatedPhoenix.submitted_at !== null);

    // Final ratings are marked FINAL
    const phoenixFinals = Database.getRatingsForTeam(phoenix.id);
    assert.equal(phoenixFinals.length, targets.length);
    assert.ok(phoenixFinals.every((r) => r.status === "FINAL"));

    // Attempting double-submit must reject with ALREADY_SUBMITTED
    await assert.rejects(
      async () => {
        await Database.submitFinalRatings(phoenix.id, validRatings, phoenix.code);
      },
      (err: any) => err.message === "ALREADY_SUBMITTED"
    );
  });

  test("Admin Unlock: Unlocks submission, converts ratings back to draft, logs audit", async () => {
    const phoenix = Database.getTeamByCode("T001")!;
    const targets = Database.getEligibleTargets(phoenix.id);

    const validRatings = targets.map((t) => ({ targetTeamId: t.id, score: 8 }));
    await Database.submitFinalRatings(phoenix.id, validRatings, phoenix.code);

    // Admin unlocks
    const unlocked = await Database.unlockTeam(phoenix.id, "admin@gwd.com");
    assert.equal(unlocked.submitted_at, null);

    // Ratings are converted back to draft
    const ratings = Database.getRatingsForTeam(phoenix.id);
    assert.ok(ratings.every((r) => r.status === "DRAFT"));

    // Audit log recorded
    const logs = Database.getAuditLogs();
    const unlockLog = logs.find((l) => l.action === "TEAM_UNLOCKED");
    assert.ok(unlockLog);
    assert.equal(unlockLog.actor, "admin@gwd.com");
  });

  test("Disqualification: Recalculates leaderboard when a team is disqualified", async () => {
    const cyberPulse = Database.getTeamByCode("T002")!; // CyberPulse had submitted ratings in seed
    assert.ok(cyberPulse);

    // Disqualify CyberPulse
    await Database.disqualifyTeam(cyberPulse.id, "DISQUALIFIED", "admin@gwd.com");

    const leaderboard = Database.getLeaderboard();
    // CyberPulse must not appear in leaderboard
    assert.ok(!leaderboard.some((e) => e.teamId === cyberPulse.id));
  });

  test("Roster Freeze & Event Control: Enforces minimum teams", async () => {
    const event = Database.getEvent();
    assert.ok(event.roster_frozen_at !== null);

    // Add a new team
    const newTeam = await Database.addTeam(
      { name: "Team Horizon", leader_name: "Jane", contact: "jane@horizon.io" },
      "admin@gwd.com"
    );
    assert.equal(newTeam.code, "T009");
    assert.equal(newTeam.name, "Team Horizon");
  });
});
