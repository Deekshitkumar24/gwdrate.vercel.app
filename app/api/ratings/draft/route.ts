import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { Database } from "@/lib/db";
import { RatingItem } from "@/lib/rules";

export async function PUT(req: NextRequest) {
  try {
    const session = getSession(req);
    if (!session || session.role !== "team" || !session.teamId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await req.json();
    const ratings: RatingItem[] = Array.isArray(body.ratings) ? body.ratings : [];

    const result = await Database.saveDraft(
      session.teamId,
      ratings,
      session.teamCode || session.teamId
    );

    return NextResponse.json({
      success: true,
      saved: result.saved,
      tensUsed: result.tensUsed,
    });
  } catch (error: any) {
    const code = error.message || "DRAFT_SAVE_FAILED";
    const status =
      code === "EVENT_NOT_OPEN"
        ? 403
        : code === "ALREADY_SUBMITTED"
        ? 409
        : code === "TOO_MANY_TENS" || code === "INVALID_SCORE" || code === "SELF_RATING"
        ? 400
        : 500;

    return NextResponse.json({ error: code, message: error.message }, { status });
  }
}
