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

  const { id } = await params;
  try {
    const body = await req.json();
    const note = body.note || "Please review and update your registration details.";
    const team = await Database.requestChangesTeam(id, note, session.email || "admin");

    return NextResponse.json({
      success: true,
      message: `Requested changes from ${team.name}.`,
      team,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "ACTION_FAILED", message: error.message || "Failed to request changes." },
      { status: 400 }
    );
  }
}
