import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ success: true, message: "Logged out successfully" });
  return clearSessionCookie(res);
}
