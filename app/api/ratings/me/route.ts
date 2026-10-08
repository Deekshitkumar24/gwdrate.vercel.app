import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { Database } from "@/lib/db";
import { computeDynamicProgress } from "@/lib/rules";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session || session.role !== "team" || !session.teamId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const team = Database.getTeamById(session.teamId);
  if (!team) {
    return NextResponse.json({ error: "TEAM_NOT_FOUND" }, { status: 404 });
  }

  const event = Database.getEvent();
  const eligibleTargets = Database.getEligibleTargets(team.id);
  const rawRatings = Database.getRatingsForTeam(team.id);

  // Filter out any ratings for targets that are no longer eligible
  const eligibleIds = new Set(eligibleTargets.map((t) => t.id));
  const validRatings = rawRatings
    .filter((r) => eligibleIds.has(r.target_team_id))
    .map((r) => ({
      targetTeamId: r.target_team_id,
      score: r.score,
      status: r.status,
    }));

  const allApprovedTeams = Database.getTeams().filter((t) => t.status === "APPROVED");
  const progress = computeDynamicProgress(
    validRatings,
    allApprovedTeams.length,
    event.max_tens
  );

  return NextResponse.json({
    ratings: validRatings,
    submitted: team.submitted_at !== null,
    submitted_at: team.submitted_at,
    progress,
    eventStatus: event.status,
  });
}
