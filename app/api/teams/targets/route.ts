import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { Database } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session || session.role !== "team" || !session.teamId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const currentTeam = Database.getTeamById(session.teamId);
  if (!currentTeam || currentTeam.status !== "APPROVED") {
    return NextResponse.json({ error: "NOT_APPROVED" }, { status: 403 });
  }

  const event = Database.getEvent();

  // Rule R2: Excludes self, excludes non-approved teams
  const targets = Database.getEligibleTargets(currentTeam.id).map((t) => ({
    id: t.id,
    code: t.code,
    name: t.name,
    leaderName: t.leader_name,
  }));

  // Dynamic target calculation: N - 1
  return NextResponse.json({
    event: {
      id: event.id,
      name: event.name,
      status: event.status,
      max_tens: event.max_tens,
      roster_frozen: event.roster_frozen_at !== null,
    },
    currentTeam: {
      id: currentTeam.id,
      code: currentTeam.code,
      name: currentTeam.name,
      submitted: currentTeam.submitted_at !== null,
      submitted_at: currentTeam.submitted_at,
    },
    targets,
    totalTargets: targets.length, // Dynamic N - 1
  });
}
