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
    const newPassword = body.password || "password123";

    await Database.resetTeamPassword(id, newPassword, session.email || "admin");
    return NextResponse.json({
      success: true,
      message: `Password has been reset to: ${newPassword}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "RESET_PASSWORD_FAILED", message: error.message },
      { status: 500 }
    );
  }
}
