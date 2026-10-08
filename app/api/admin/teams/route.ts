import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { Database } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  await Database.ensureSynced();
  const teams = Database.getTeams();
  const event = Database.getEvent();
  const progress = Database.getSubmissionProgress();

  return NextResponse.json({
    teams,
    event,
    progress,
  });
}

export async function POST(req: NextRequest) {
  const session = getSession(req);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, leader_name, contact, password, status } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "MISSING_NAME", message: "Team name is required." },
        { status: 400 }
      );
    }

    const team = await Database.addTeam(
      {
        name,
        leader_name: leader_name || "Team Leader",
        contact: contact || "admin-added@event.local",
        password: password || "password123",
        status: status || "APPROVED",
      },
      session.email || "admin"
    );

    return NextResponse.json({ success: true, team });
  } catch (error: any) {
    return NextResponse.json(
      { error: "ADD_FAILED", message: error.message },
      { status: 500 }
    );
  }
}
