import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { Database } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = getSession(req);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const event = await Database.freezeRoster(session.email || "admin");
    const approvedTeams = Database.getTeams().filter((t) => t.status === "APPROVED");

    return NextResponse.json({
      success: true,
      message: `Roster frozen successfully with ${approvedTeams.length} approved teams.`,
      event,
      frozenTeamCount: approvedTeams.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "FREEZE_FAILED", message: error.message },
      { status: 400 }
    );
  }
}
