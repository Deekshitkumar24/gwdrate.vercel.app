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
    const updated = await Database.configureEvent(body, session.email || "admin");
    return NextResponse.json({ success: true, event: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: "CONFIG_FAILED", message: error.message || "Failed to update configuration." },
      { status: 500 }
    );
  }
}
