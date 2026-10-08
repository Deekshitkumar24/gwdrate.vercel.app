import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { Database, EventStatus } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = getSession(req);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { status, name, max_tens } = body;

    const validStatuses: EventStatus[] = [
      "DRAFT",
      "REGISTRATION_OPEN",
      "REGISTRATION_CLOSED",
      "VOTING_READY",
      "VOTING_OPEN",
      "VOTING_CLOSED",
      "RESULTS_PUBLISHED",
      "ARCHIVED",
      "REGISTRATION",
      "OPEN",
      "CLOSED",
    ];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "INVALID_STATUS", message: "Invalid lifecycle status." },
        { status: 400 }
      );
    }

    const updates: any = {};
    if (status) updates.status = status;
    if (name) updates.name = name;
    if (typeof max_tens === "number" && max_tens >= 1) updates.max_tens = max_tens;
    if (status === "RESULTS_PUBLISHED") {
      updates.is_results_published = true;
      updates.leaderboard_visible = true;
      updates.leaderboard_visibility = "PUBLIC";
    }

    // Opening voting is blocked while N is below minimum or roster is not frozen
    if (status === "OPEN" || status === "VOTING_OPEN") {
      const currentEvent = Database.getEvent();
      const approvedTeams = Database.getTeams().filter((t) => t.status === "APPROVED");
      if (approvedTeams.length < currentEvent.min_teams) {
        return NextResponse.json(
          {
            error: "MINIMUM_TEAMS_REQUIRED",
            message: `Cannot open rating: At least ${currentEvent.min_teams} approved teams are required (currently ${approvedTeams.length}).`,
          },
          { status: 400 }
        );
      }
      if (!currentEvent.roster_frozen_at) {
        return NextResponse.json(
          {
            error: "ROSTER_NOT_FROZEN",
            message: "Cannot open rating until the roster is frozen. Please freeze the roster first.",
          },
          { status: 400 }
        );
      }
    }

    const event = await Database.updateEvent(updates, session.email || "admin");
    return NextResponse.json({ success: true, event });
  } catch (error: any) {
    return NextResponse.json(
      { error: "UPDATE_FAILED", message: error.message },
      { status: 500 }
    );
  }
}
