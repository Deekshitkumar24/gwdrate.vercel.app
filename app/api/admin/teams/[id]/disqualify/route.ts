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
    const body = await req.json().catch(() => ({}));
    const newStatus = body.status || "DISQUALIFIED";

    if (!["DISQUALIFIED", "WITHDRAWN", "APPROVED"].includes(newStatus)) {
      return NextResponse.json(
        { error: "INVALID_STATUS", message: "Status must be DISQUALIFIED, WITHDRAWN, or APPROVED." },
        { status: 400 }
      );
    }

    const team = await Database.disqualifyTeam(
      id,
      newStatus as any,
      session.email || "admin"
    );

    return NextResponse.json({
      success: true,
      message: `Team status updated to ${newStatus}. Leaderboard recalculated.`,
      team,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "DISQUALIFY_FAILED", message: error.message },
      { status: 500 }
    );
  }
}
