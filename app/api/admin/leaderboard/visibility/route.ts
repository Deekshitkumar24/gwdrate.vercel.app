import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { Database } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = getSession(req);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const visible = Boolean(body.visible);

    const event = await Database.updateEvent(
      { leaderboard_visible: visible },
      session.email || "admin"
    );

    return NextResponse.json({
      success: true,
      leaderboard_visible: event.leaderboard_visible,
      message: `Leaderboard is now ${event.leaderboard_visible ? "VISIBLE to public viewers" : "HIDDEN from public viewers"}.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "VISIBILITY_TOGGLE_FAILED", message: error.message },
      { status: 500 }
    );
  }
}
