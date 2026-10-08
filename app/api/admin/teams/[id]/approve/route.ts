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
    const team = await Database.approveTeam(id, session.email || "admin");
    return NextResponse.json({ success: true, team });
  } catch (error: any) {
    return NextResponse.json(
      { error: "APPROVE_FAILED", message: error.message },
      { status: 500 }
    );
  }
}
