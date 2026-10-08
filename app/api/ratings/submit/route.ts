import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { Database } from "@/lib/db";
import { RatingItem } from "@/lib/rules";

export async function POST(req: NextRequest) {
  try {
    const session = getSession(req);
    // FR-A5: The rater identity is ALWAYS taken from the session, never from the request body!
    if (!session || session.role !== "team" || !session.teamId) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Not logged in or session expired." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const ratings: RatingItem[] = Array.isArray(body.ratings) ? body.ratings : [];

    // Atomic submission pipeline execution
    const result = await Database.submitFinalRatings(
      session.teamId,
      ratings,
      session.teamCode || session.teamId
    );

    return NextResponse.json({
      success: true,
      message: "Ratings submitted successfully and locked.",
      leaderboard: result.leaderboard,
    });
  } catch (error: any) {
    const code = error.message || "SUBMIT_FAILED";
    let status = 500;

    switch (code) {
      case "EVENT_NOT_OPEN":
        status = 403;
        break;
      case "NOT_APPROVED":
        status = 403;
        break;
      case "ALREADY_SUBMITTED":
        status = 409;
        break;
      case "SELF_RATING":
      case "INVALID_SCORE":
      case "TOO_MANY_TENS":
      case "INCOMPLETE":
      case "DUPLICATE_RATING":
      case "INVALID_TARGET":
        status = 400;
        break;
      case "UNAUTHORIZED":
        status = 401;
        break;
      default:
        status = 500;
    }

    return NextResponse.json(
      { error: code, message: error.message },
      { status }
    );
  }
}
