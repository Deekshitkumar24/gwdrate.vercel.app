import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { Database } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = getSession(req);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    await Database.resetCleanState(session.email || "admin@gwd.com");
    return NextResponse.json({
      success: true,
      message: "Event database successfully reset to clean zero-mock state.",
      event: Database.getEvent(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "RESET_FAILED", message: error.message || "Failed to reset clean database." },
      { status: 500 }
    );
  }
}
