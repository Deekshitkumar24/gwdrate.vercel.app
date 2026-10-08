import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { Database } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  if (session.role === "team" && session.teamId) {
    const team = Database.getTeamById(session.teamId);
    if (!team || team.status === "DISQUALIFIED" || team.status === "WITHDRAWN") {
      return NextResponse.json(
        { authenticated: false, error: "TEAM_INACTIVE" },
        { status: 403 }
      );
    }
    return NextResponse.json({
      authenticated: true,
      user: {
        role: "team",
        teamId: team.id,
        teamCode: team.code,
        teamName: team.name,
        leaderName: team.leader_name,
        contact: team.contact,
        leaderEmail: team.leader_email,
        institution: team.institution,
        description: team.description,
        status: team.status,
        changes_requested_note: team.changes_requested_note,
        submitted: team.submitted_at !== null,
        submitted_at: team.submitted_at,
        members: team.members || [],
      },
    });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      role: "admin",
      email: session.email,
    },
  });
}
