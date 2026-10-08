import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  validateFinalRatings,
  validateDraftRatings,
  computeLeaderboard,
  computeDynamicProgress,
  countTens,
  TeamEntity,
  FinalRatingEntity,
} from "../lib/rules/index";

describe("Business Rules & Validation (Unit Tests)", () => {
  const currentTeamId = "team-1";
  const eligibleTargets = ["team-2", "team-3", "team-4", "team-5", "team-6", "team-7", "team-8"]; // 7 targets for N=8

  test("R1: Rejects scores outside 1-10 or non-integers", () => {
    // Score 0
    let res = validateFinalRatings(
      currentTeamId,
      eligibleTargets.map((id, i) => ({ targetTeamId: id, score: i === 0 ? 0 : 8 })),
      eligibleTargets
    );
    assert.equal(res.valid, false);
    assert.equal(res.code, "INVALID_SCORE");

    // Score 11
    res = validateFinalRatings(
      currentTeamId,
      eligibleTargets.map((id, i) => ({ targetTeamId: id, score: i === 0 ? 11 : 8 })),
      eligibleTargets
    );
    assert.equal(res.valid, false);
    assert.equal(res.code, "INVALID_SCORE");

    // Float score 8.5
    res = validateFinalRatings(
      currentTeamId,
      eligibleTargets.map((id, i) => ({ targetTeamId: id, score: i === 0 ? 8.5 : 8 })),
      eligibleTargets
    );
    assert.equal(res.valid, false);
    assert.equal(res.code, "INVALID_SCORE");
  });

  test("R2: Strictly rejects self-rating", () => {
    const invalidRatings = [
      ...eligibleTargets.slice(0, 6).map((id) => ({ targetTeamId: id, score: 8 })),
      { targetTeamId: currentTeamId, score: 10 }, // Self-rating attempt!
    ];
    const res = validateFinalRatings(currentTeamId, invalidRatings, eligibleTargets);
    assert.equal(res.valid, false);
    assert.equal(res.code, "SELF_RATING");
  });

  test("R3: Strictly rejects duplicate ratings for the same target", () => {
    const invalidRatings = [
      { targetTeamId: "team-2", score: 8 },
      { targetTeamId: "team-2", score: 9 }, // duplicate team-2
      { targetTeamId: "team-3", score: 7 },
      { targetTeamId: "team-4", score: 8 },
      { targetTeamId: "team-5", score: 8 },
      { targetTeamId: "team-6", score: 8 },
      { targetTeamId: "team-7", score: 8 },
    ];
    const res = validateFinalRatings(currentTeamId, invalidRatings, eligibleTargets);
    assert.equal(res.valid, false);
    assert.equal(res.code, "DUPLICATE_RATING");
  });

  test("R4: The Five-10s Rule - allows up to 5 tens, rejects 6 tens", () => {
    // 0 tens used (valid, tens are optional)
    let res = validateFinalRatings(
      currentTeamId,
      eligibleTargets.map((id) => ({ targetTeamId: id, score: 7 })),
      eligibleTargets
    );
    assert.equal(res.valid, true);

    // Exactly 5 tens used (valid)
    res = validateFinalRatings(
      currentTeamId,
      eligibleTargets.map((id, idx) => ({ targetTeamId: id, score: idx < 5 ? 10 : 8 })),
      eligibleTargets
    );
    assert.equal(res.valid, true);

    // Attempting 6 tens (rejected with TOO_MANY_TENS)
    res = validateFinalRatings(
      currentTeamId,
      eligibleTargets.map((id, idx) => ({ targetTeamId: id, score: idx < 6 ? 10 : 8 })),
      eligibleTargets
    );
    assert.equal(res.valid, false);
    assert.equal(res.code, "TOO_MANY_TENS");
  });

  test("Completeness: Rejects final submission if any target is unrated", () => {
    // Only 6 of 7 rated
    const incomplete = eligibleTargets.slice(0, 6).map((id) => ({ targetTeamId: id, score: 8 }));
    const res = validateFinalRatings(currentTeamId, incomplete, eligibleTargets);
    assert.equal(res.valid, false);
    assert.equal(res.code, "INCOMPLETE");
  });

  test("Dynamic team count: Correctly calculates eligible targets (N - 1) for variable N", () => {
    // N = 4 teams -> 3 targets
    let prog = computeDynamicProgress([], 4, 5);
    assert.equal(prog.totalEligibleTargets, 3);
    assert.equal(prog.maxTensAllowed, 3); // limited to N-1

    // N = 10 teams -> 9 targets, max 5 tens
    prog = computeDynamicProgress([], 10, 5);
    assert.equal(prog.totalEligibleTargets, 9);
    assert.equal(prog.maxTensAllowed, 5);

    // N = 47 teams -> 46 targets, max 5 tens
    prog = computeDynamicProgress([], 47, 5);
    assert.equal(prog.totalEligibleTargets, 46);
    assert.equal(prog.maxTensAllowed, 5);

    // N = 100 teams -> 99 targets, max 5 tens
    prog = computeDynamicProgress([], 100, 5);
    assert.equal(prog.totalEligibleTargets, 99);
    assert.equal(prog.maxTensAllowed, 5);
  });
});

describe("Leaderboard Calculation & Tie-Breaker Logic (Unit Tests)", () => {
  const teams: TeamEntity[] = [
    { id: "t1", code: "T001", name: "Team One", status: "APPROVED" },
    { id: "t2", code: "T002", name: "Team Two", status: "APPROVED" },
    { id: "t3", code: "T003", name: "Team Three", status: "APPROVED" },
    { id: "t4", code: "T004", name: "Team Four", status: "APPROVED" },
  ];

  test("Computes accurate averages and ranks highest first", () => {
    const ratings: FinalRatingEntity[] = [
      // t1 receives: 10, 10, 9 -> avg = 29/3 = 9.67
      { raterTeamId: "t2", targetTeamId: "t1", score: 10 },
      { raterTeamId: "t3", targetTeamId: "t1", score: 10 },
      { raterTeamId: "t4", targetTeamId: "t1", score: 9 },

      // t2 receives: 8, 8, 8 -> avg = 24/3 = 8.00
      { raterTeamId: "t1", targetTeamId: "t2", score: 8 },
      { raterTeamId: "t3", targetTeamId: "t2", score: 8 },
      { raterTeamId: "t4", targetTeamId: "t2", score: 8 },

      // t3 receives: 9, 9, 9 -> avg = 27/3 = 9.00
      { raterTeamId: "t1", targetTeamId: "t3", score: 9 },
      { raterTeamId: "t2", targetTeamId: "t3", score: 9 },
      { raterTeamId: "t4", targetTeamId: "t3", score: 9 },
    ];

    const lb = computeLeaderboard(teams, ratings);
    assert.equal(lb[0].teamId, "t1");
    assert.equal(lb[0].avgScore, 9.67);
    assert.equal(lb[0].rank, 1);

    assert.equal(lb[1].teamId, "t3");
    assert.equal(lb[1].avgScore, 9.00);
    assert.equal(lb[1].rank, 2);

    assert.equal(lb[2].teamId, "t2");
    assert.equal(lb[2].avgScore, 8.00);
    assert.equal(lb[2].rank, 3);
  });

  test("Tie-Breaker Rule 1: Higher count of 10s received ranks higher on same average", () => {
    // Both t1 and t2 have average of 9.0 (18 points / 2 ratings)
    // t1: 10 and 8 (one 10)
    // t2: 9 and 9 (zero 10s)
    const ratings: FinalRatingEntity[] = [
      { raterTeamId: "t3", targetTeamId: "t1", score: 10 },
      { raterTeamId: "t4", targetTeamId: "t1", score: 8 },

      { raterTeamId: "t3", targetTeamId: "t2", score: 9 },
      { raterTeamId: "t4", targetTeamId: "t2", score: 9 },
    ];

    const lb = computeLeaderboard(teams, ratings);
    assert.equal(lb[0].avgScore, 9.00);
    assert.equal(lb[1].avgScore, 9.00);

    // t1 has 1 ten, t2 has 0 tens -> t1 must be rank 1, t2 rank 2
    assert.equal(lb[0].teamId, "t1");
    assert.equal(lb[0].tensReceived, 1);
    assert.equal(lb[0].rank, 1);

    assert.equal(lb[1].teamId, "t2");
    assert.equal(lb[1].tensReceived, 0);
    assert.equal(lb[1].rank, 2);
  });

  test("Tie-Breaker Rule 2: Higher count of 9s received breaks tie if tens are equal", () => {
    // t1: scores [10, 9, 8] -> sum=27, avg=9.00, tens=1, nines=1
    // t2: scores [10, 10, 7] wait, that has tens=2.
    // Let's do:
    // t1: scores [10, 9, 8] -> sum=27, avg=9.0, tens=1, nines=1
    // t2: scores [10, 8.5...] wait, scores are integers.
    // Let's do sum=26 for 3 ratings:
    // t1: [10, 9, 7] -> sum 26, avg 8.67, tens=1, nines=1
    // t2: [10, 8, 8] -> sum 26, avg 8.67, tens=1, nines=0
    const ratings: FinalRatingEntity[] = [
      { raterTeamId: "t2", targetTeamId: "t1", score: 10 },
      { raterTeamId: "t3", targetTeamId: "t1", score: 9 },
      { raterTeamId: "t4", targetTeamId: "t1", score: 7 },

      { raterTeamId: "t1", targetTeamId: "t2", score: 10 },
      { raterTeamId: "t3", targetTeamId: "t2", score: 8 },
      { raterTeamId: "t4", targetTeamId: "t2", score: 8 },
    ];

    const lb = computeLeaderboard(teams, ratings);
    assert.equal(lb[0].avgScore, 8.67);
    assert.equal(lb[1].avgScore, 8.67);
    assert.equal(lb[0].tensReceived, 1);
    assert.equal(lb[1].tensReceived, 1);

    // t1 has 1 nine, t2 has 0 nines -> t1 ranks ahead!
    assert.equal(lb[0].teamId, "t1");
    assert.equal(lb[0].rank, 1);
    assert.equal(lb[1].teamId, "t2");
    assert.equal(lb[1].rank, 2);
  });

  test("Tie-Breaker Rule 3: Identical averages, tens, and nines share the same rank", () => {
    const ratings: FinalRatingEntity[] = [
      { raterTeamId: "t3", targetTeamId: "t1", score: 10 },
      { raterTeamId: "t4", targetTeamId: "t1", score: 8 },

      { raterTeamId: "t3", targetTeamId: "t2", score: 10 },
      { raterTeamId: "t4", targetTeamId: "t2", score: 8 },
    ];

    const lb = computeLeaderboard(teams, ratings);
    assert.equal(lb[0].rank, 1);
    assert.equal(lb[1].rank, 1);
    assert.equal(lb[0].isTied, true);
    assert.equal(lb[1].isTied, true);
  });

  test("R9: Excludes disqualified and withdrawn teams from leaderboard", () => {
    const teamsWithDQ: TeamEntity[] = [
      { id: "t1", code: "T001", name: "Team One", status: "APPROVED" },
      { id: "t2", code: "T002", name: "Team Two", status: "DISQUALIFIED" },
      { id: "t3", code: "T003", name: "Team Three", status: "WITHDRAWN" },
    ];

    const ratings: FinalRatingEntity[] = [
      { raterTeamId: "t2", targetTeamId: "t1", score: 10 }, // from DQ team
      { raterTeamId: "t1", targetTeamId: "t2", score: 10 }, // to DQ team
    ];

    const lb = computeLeaderboard(teamsWithDQ, ratings);
    // Only t1 is eligible
    assert.equal(lb.length, 1);
    assert.equal(lb[0].teamId, "t1");
    // Rating from t2 was excluded because t2 is disqualified!
    assert.equal(lb[0].ratingsReceived, 0);
  });
});
