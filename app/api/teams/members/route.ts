import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { Database } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const teamId = session.role === "admin" ? body.teamId : session.teamId;
    if (!teamId) {
      return NextResponse.json({ error: "MISSING_TEAM_ID" }, { status: 400 });
    }

    const { name, role, email, is_leader } = body;
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "NAME_REQUIRED", message: "Member name is required." }, { status: 400 });
    }

    const member = await Database.addTeamMember(
      teamId,
      { name, role: role || "Member", email, is_leader: Boolean(is_leader) },
      session.role === "admin" ? (session.email || "admin") : (session.teamCode || teamId)
    );

    return NextResponse.json({ success: true, member });
  } catch (error: any) {
    return NextResponse.json(
      { error: "ADD_MEMBER_FAILED", message: error.message || "Failed to add member." },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get("memberId");
    const targetTeamId = session.role === "admin" ? searchParams.get("teamId") : session.teamId;

    if (!memberId || !targetTeamId) {
      return NextResponse.json({ error: "MISSING_PARAMS", message: "Member ID and Team ID required." }, { status: 400 });
    }

    await Database.removeTeamMember(
      targetTeamId,
      memberId,
      session.role === "admin" ? (session.email || "admin") : (session.teamCode || targetTeamId)
    );

    return NextResponse.json({ success: true, message: "Member removed." });
  } catch (error: any) {
    return NextResponse.json(
      { error: "REMOVE_MEMBER_FAILED", message: error.message || "Failed to remove member." },
      { status: 400 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { memberId, teamId: bodyTeamId, updates } = body;
    const teamId = session.role === "admin" ? bodyTeamId : session.teamId;

    if (!memberId || !teamId || !updates) {
      return NextResponse.json({ error: "MISSING_PARAMS" }, { status: 400 });
    }

    const updated = await Database.updateTeamMember(
      teamId,
      memberId,
      updates,
      session.role === "admin" ? (session.email || "admin") : (session.teamCode || teamId)
    );

    return NextResponse.json({ success: true, member: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: "UPDATE_MEMBER_FAILED", message: error.message || "Failed to update member." },
      { status: 400 }
    );
  }
}
