import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/db";
import { checkRateLimit } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "local";
    if (!checkRateLimit(`register:${ip}`, 10, 600000)) {
      return NextResponse.json(
        { error: "RATE_LIMITED", message: "Too many registration attempts. Please wait." },
        { status: 429 }
      );
    }

    await Database.ensureSynced();

    const body = await req.json();
    const { name, leader_name, contact, password, leader_email, institution, description, members } = body;

    if (!name || !leader_name || !contact || !password) {
      return NextResponse.json(
        { error: "MISSING_FIELDS", message: "All required registration fields must be provided." },
        { status: 400 }
      );
    }

    const result = await Database.registerTeam({
      name,
      leader_name,
      contact,
      password,
      leader_email,
      institution,
      description,
      members,
    });

    return NextResponse.json({
      success: true,
      message: "Team registration submitted successfully. Awaiting organizer approval.",
      teamCode: result.code,
      team: {
        id: result.team.id,
        code: result.team.code,
        name: result.team.name,
        leaderName: result.team.leader_name,
        status: result.team.status,
      },
    });
  } catch (error: any) {
    const code = error.message || "REGISTRATION_FAILED";
    let status = 400;

    if (code === "REGISTRATION_CLOSED") {
      status = 403;
    } else if (code === "TEAM_NAME_TAKEN") {
      status = 409;
    }

    return NextResponse.json(
      { error: code, message: error.message },
      { status }
    );
  }
}
