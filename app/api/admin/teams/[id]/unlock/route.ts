import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { Database } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getSession(req);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const team = await Database.unlockTeam(id, session.email || "admin");
    return NextResponse.json({
      success: true,
      message: `Team ${team.name} (${team.code}) has been unlocked. Their ratings can now be edited and re-submitted.`,
      team,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "UNLOCK_FAILED", message: error.message },
      { status: 500 }
    );
  }
}
