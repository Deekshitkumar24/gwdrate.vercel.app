import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { Database } from "@/lib/db";

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

  return NextResponse.json({
    success: true,
    team: {
      id: team.id,
      code: team.code,
      name: team.name,
      leader_name: team.leader_name,
      contact: team.contact,
      leader_email: team.leader_email,
      institution: team.institution,
      description: team.description,
      status: team.status,
      changes_requested_note: team.changes_requested_note,
      registered_at: team.registered_at,
      approved_at: team.approved_at,
      submitted_at: team.submitted_at,
      members: team.members || [],
    },
    event,
  });
}

export async function PUT(req: NextRequest) {
  const session = getSession(req);
  if (!session || session.role !== "team" || !session.teamId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const updated = await Database.updateTeamRegistration(
      session.teamId,
      body,
      session.teamCode || session.teamId
    );

    return NextResponse.json({
      success: true,
      message: "Team registration updated successfully.",
      team: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "UPDATE_FAILED", message: error.message || "Failed to update team." },
      { status: 400 }
    );
  }
}
