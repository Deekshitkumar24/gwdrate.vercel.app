import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { Database } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = getSession(req);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  await Database.resetDemoData();
  return NextResponse.json({
    success: true,
    message: "Demo dataset reset successfully with default teams and live event data.",
  });
}
