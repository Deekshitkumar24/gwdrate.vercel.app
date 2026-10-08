export interface RatingItem {
  targetTeamId: string;
  score: number;
}

export interface ValidationResult {
  valid: boolean;
  code?: string;
  error?: string;
}

export interface LeaderboardEntry {
  rank: number;
  teamId: string;
  teamCode: string;
  teamName: string;
  avgScore: number;
  ratingsReceived: number;
  tensReceived: number;
  ninesReceived: number;
  isTied: boolean;
}

export interface DynamicProgress {
  totalEligibleTargets: number; // N - 1
  ratedCount: number;
  tensUsed: number;
  maxTensAllowed: number;
  isComplete: boolean;
  canGiveTen: boolean;
}

/**
 * Counts how many 10 ratings are present in a list of ratings.
 */
export function countTens(ratings: RatingItem[]): number {
  return ratings.filter((r) => r.score === 10).length;
}

/**
 * Counts how many 9 ratings are present in a list of ratings.
 */
export function countNines(ratings: RatingItem[]): number {
  return ratings.filter((r) => r.score === 9).length;
}

/**
 * Calculates dynamic targets and limits for a team.
 * Never hardcodes any number of teams.
 */
export function computeDynamicProgress(
  ratings: RatingItem[],
  totalActiveApprovedTeams: number,
  maxTensConfig: number = 5
): DynamicProgress {
  // Each team rates every active approved team except themselves (N - 1)
  const totalEligibleTargets = Math.max(0, totalActiveApprovedTeams - 1);
  const maxTensAllowed = Math.min(maxTensConfig, totalEligibleTargets);
  const ratedCount = ratings.length;
  const tensUsed = countTens(ratings);
  const isComplete = totalEligibleTargets > 0 && ratedCount === totalEligibleTargets;
  const canGiveTen = tensUsed < maxTensAllowed;

  return {
    totalEligibleTargets,
    ratedCount,
    tensUsed,
    maxTensAllowed,
    isComplete,
    canGiveTen,
  };
}

/**
 * Validates a rating submission according to all business rules (R1, R2, R3, R4, R12).
 */
export function validateFinalRatings(
  raterTeamId: string,
  submittedRatings: RatingItem[],
  eligibleTargetTeamIds: string[],
  maxTensConfig: number = 5
): ValidationResult {
  const eligibleSet = new Set(eligibleTargetTeamIds);
  const totalRequired = eligibleTargetTeamIds.length;
  const maxTensAllowed = Math.min(maxTensConfig, totalRequired);

  // R2: Self-rating check
  for (const item of submittedRatings) {
    if (item.targetTeamId === raterTeamId) {
      return {
        valid: false,
        code: "SELF_RATING",
        error: "A team cannot rate itself.",
      };
    }
  }

  // R1: Score validation (1 to 10 integers)
  for (const item of submittedRatings) {
    if (
      typeof item.score !== "number" ||
      !Number.isInteger(item.score) ||
      item.score < 1 ||
      item.score > 10
    ) {
      return {
        valid: false,
        code: "INVALID_SCORE",
        error: "All ratings must be whole numbers from 1 to 10.",
      };
    }
  }

  // R3: No duplicate ratings per target
  const seenTargets = new Set<string>();
  for (const item of submittedRatings) {
    if (seenTargets.has(item.targetTeamId)) {
      return {
        valid: false,
        code: "DUPLICATE_RATING",
        error: "Duplicate rating for target team.",
      };
    }
    seenTargets.add(item.targetTeamId);

    // Ensure target is actually an eligible target
    if (!eligibleSet.has(item.targetTeamId)) {
      return {
        valid: false,
        code: "INVALID_TARGET",
        error: `Target team ${item.targetTeamId} is not in the eligible team list.`,
      };
    }
  }

  // Check completeness: must rate all eligible targets
  if (seenTargets.size !== totalRequired) {
    return {
      valid: false,
      code: "INCOMPLETE",
      error: `All ${totalRequired} eligible teams must be rated before final submission. (Rated: ${seenTargets.size}/${totalRequired})`,
    };
  }

  // R4: Max tens check
  const tensCount = countTens(submittedRatings);
  if (tensCount > maxTensAllowed) {
    return {
      valid: false,
      code: "TOO_MANY_TENS",
      error: `You may give a rating of 10 to at most ${maxTensAllowed} teams. (Attempted: ${tensCount})`,
    };
  }

  return { valid: true };
}

/**
 * Validates draft ratings (allows partial completion, but enforces R1, R2, R3, R4 limits).
 */
export function validateDraftRatings(
  raterTeamId: string,
  draftRatings: RatingItem[],
  eligibleTargetTeamIds: string[],
  maxTensConfig: number = 5
): ValidationResult {
  const eligibleSet = new Set(eligibleTargetTeamIds);
  const maxTensAllowed = Math.min(maxTensConfig, eligibleTargetTeamIds.length);

  const seenTargets = new Set<string>();
  for (const item of draftRatings) {
    if (item.targetTeamId === raterTeamId) {
      return {
        valid: false,
        code: "SELF_RATING",
        error: "Cannot rate own team.",
      };
    }
    if (seenTargets.has(item.targetTeamId)) {
      return {
        valid: false,
        code: "DUPLICATE_RATING",
        error: "Duplicate rating in draft.",
      };
    }
    seenTargets.add(item.targetTeamId);

    if (!eligibleSet.has(item.targetTeamId)) {
      return {
        valid: false,
        code: "INVALID_TARGET",
        error: "Target team is not eligible.",
      };
    }

    if (
      typeof item.score !== "number" ||
      !Number.isInteger(item.score) ||
      item.score < 1 ||
      item.score > 10
    ) {
      return {
        valid: false,
        code: "INVALID_SCORE",
        error: "Scores must be integers between 1 and 10.",
      };
    }
  }

  if (countTens(draftRatings) > maxTensAllowed) {
    return {
      valid: false,
      code: "TOO_MANY_TENS",
      error: `Cannot exceed ${maxTensAllowed} ratings of 10.`,
    };
  }

  return { valid: true };
}

export interface TeamEntity {
  id: string;
  code: string;
  name: string;
  status: "PENDING" | "REJECTED" | "APPROVED" | "DISQUALIFIED" | "WITHDRAWN" | "CHANGES_REQUESTED";
}

export interface FinalRatingEntity {
  raterTeamId: string;
  targetTeamId: string;
  score: number;
}

/**
 * Computes leaderboard from final submitted ratings received.
 * Adheres strictly to Section 7.3:
 * - avg_score = average of FINAL ratings received by the team
 * - ratings_received = count of those ratings
 * - rank using dense ranking by avg_score descending
 * - Tie-breakers (in order):
 *   1. Higher count of 10s received
 *   2. Higher count of 9s received
 *   3. Otherwise share the same rank
 * - Disqualified / withdrawn teams are excluded.
 */
export function computeLeaderboard(
  activeTeams: TeamEntity[],
  finalRatings: FinalRatingEntity[]
): LeaderboardEntry[] {
  // Only include APPROVED active teams
  const eligibleTeams = activeTeams.filter((t) => t.status === "APPROVED");
  const eligibleTeamIds = new Set(eligibleTeams.map((t) => t.id));

  // Filter ratings: rater and target must both be approved active teams
  const validRatings = finalRatings.filter(
    (r) =>
      eligibleTeamIds.has(r.raterTeamId) &&
      eligibleTeamIds.has(r.targetTeamId) &&
      r.raterTeamId !== r.targetTeamId
  );

  // Aggregate ratings received per target team
  const statsMap = new Map<
    string,
    { sum: number; count: number; tens: number; nines: number }
  >();

  for (const team of eligibleTeams) {
    statsMap.set(team.id, { sum: 0, count: 0, tens: 0, nines: 0 });
  }

  for (const r of validRatings) {
    const stats = statsMap.get(r.targetTeamId);
    if (stats) {
      stats.sum += r.score;
      stats.count += 1;
      if (r.score === 10) stats.tens += 1;
      if (r.score === 9) stats.nines += 1;
    }
  }

  // Build unsorted entries
  const entries = eligibleTeams.map((team) => {
    const stats = statsMap.get(team.id)!;
    const avgScore = stats.count > 0 ? Number((stats.sum / stats.count).toFixed(2)) : 0;
    return {
      teamId: team.id,
      teamCode: team.code,
      teamName: team.name,
      avgScore,
      ratingsReceived: stats.count,
      tensReceived: stats.tens,
      ninesReceived: stats.nines,
      rank: 1,
      isTied: false,
    };
  });

  // Sort descending:
  // 1. avgScore
  // 2. tensReceived
  // 3. ninesReceived
  entries.sort((a, b) => {
    if (b.avgScore !== a.avgScore) {
      return b.avgScore - a.avgScore;
    }
    if (b.tensReceived !== a.tensReceived) {
      return b.tensReceived - a.tensReceived;
    }
    if (b.ninesReceived !== a.ninesReceived) {
      return b.ninesReceived - a.ninesReceived;
    }
    return a.teamName.localeCompare(b.teamName);
  });

  // Assign dense ranks and identify shared ties
  let currentRank = 1;
  for (let i = 0; i < entries.length; i++) {
    if (i === 0) {
      entries[i].rank = 1;
    } else {
      const prev = entries[i - 1];
      const curr = entries[i];
      const isExactlyEqual =
        curr.avgScore === prev.avgScore &&
        curr.tensReceived === prev.tensReceived &&
        curr.ninesReceived === prev.ninesReceived;

      if (isExactlyEqual) {
        entries[i].rank = prev.rank;
        entries[i].isTied = true;
        entries[i - 1].isTied = true;
      } else {
        currentRank += 1;
        entries[i].rank = currentRank;
      }
    }
  }

  return entries;
}
