import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Database } from "@/lib/db";
import {
  attachSessionCookie,
  checkRateLimit,
  resetRateLimit,
  SessionPayload,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "local";
    const body = await req.json();
    const { type, code, email, password } = body;

    // Rate limiting
    const rateLimitKey = `${ip}:${code || email || "anon"}`;
    if (!checkRateLimit(rateLimitKey, 6, 600000)) {
      return NextResponse.json(
        { error: "RATE_LIMITED", message: "Too many login attempts. Please wait 10 minutes." },
        { status: 429 }
      );
    }

    await Database.ensureSynced();

    if (type === "admin") {
      const state = Database.getEvent(); // loads state
      const adminEmail = process.env.ADMIN_BOOTSTRAP_EMAIL || "admin@gwd.com";
      const adminPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD || "admin1234";

      if (email?.trim().toLowerCase() === adminEmail.toLowerCase() && password === adminPassword) {
        resetRateLimit(rateLimitKey);
        await Database.recordAudit(email, "LOGIN", { role: "admin" });

        const sessionPayload: SessionPayload = {
          role: "admin",
          email: adminEmail,
          createdAt: Date.now(),
        };

        const res = NextResponse.json({
          success: true,
          user: { role: "admin", email: adminEmail },
        });
        return attachSessionCookie(res, sessionPayload);
      }

      return NextResponse.json(
        { error: "INVALID_CREDENTIALS", message: "Invalid administrator credentials." },
        { status: 401 }
      );
    }

    // Team login
    if (!code || !password) {
      return NextResponse.json(
        { error: "MISSING_FIELDS", message: "Team code and password are required." },
        { status: 400 }
      );
    }

    const team = Database.getTeamByCode(code);
    if (!team) {
      return NextResponse.json(
        { error: "INVALID_CREDENTIALS", message: "Team not found. Please check your team code." },
        { status: 401 }
      );
    }

    // Check password
    const passwordMatch = bcrypt.compareSync(password, team.password_hash);
    if (!passwordMatch) {
      return NextResponse.json(
        { error: "INVALID_CREDENTIALS", message: "Incorrect password." },
        { status: 401 }
      );
    }

    if (team.status === "REJECTED") {
      return NextResponse.json(
        {
          error: "NOT_APPROVED",
          message: "Your registration has been reviewed and rejected by the organizer.",
        },
        { status: 403 }
      );
    }

    if (team.status === "DISQUALIFIED" || team.status === "WITHDRAWN") {
      return NextResponse.json(
        {
          error: "NOT_APPROVED",
          message: `This team has been marked as ${team.status} and cannot access the event.`,
        },
        { status: 403 }
      );
    }

    resetRateLimit(rateLimitKey);
    await Database.recordAudit(team.code, "LOGIN", {
      teamName: team.name,
      role: "team",
    });

    const sessionPayload: SessionPayload = {
      role: "team",
      teamId: team.id,
      teamCode: team.code,
      teamName: team.name,
      createdAt: Date.now(),
    };

    const res = NextResponse.json({
      success: true,
      user: {
        role: "team",
        teamId: team.id,
        teamCode: team.code,
        teamName: team.name,
        submitted: team.submitted_at !== null,
      },
    });

    return attachSessionCookie(res, sessionPayload);
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: error.message || "An error occurred." },
      { status: 500 }
    );
  }
}
