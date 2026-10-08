import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { Database } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await Database.ensureSynced();
    const session = getSession(req);
    const event = Database.getEvent();
    const progress = Database.getSubmissionProgress();
    const isAdmin = session?.role === "admin";

    // If hidden and not admin
    if (!event.leaderboard_visible && !isAdmin) {
      return NextResponse.json({
        visible: false,
        event: {
          id: event.id,
          name: event.name,
          status: event.status,
        },
        progress: {
          totalActive: progress.totalActive,
          submittedCount: progress.submittedCount,
          percentage: progress.percentage,
        },
        message: "The leaderboard is currently hidden by the event organizer. Rankings will be revealed soon!",
      });
    }

    const leaderboard = Database.getLeaderboard();

    return NextResponse.json({
      visible: true,
      hiddenPreview: !event.leaderboard_visible && isAdmin,
      event: {
        id: event.id,
        name: event.name,
        status: event.status,
        leaderboard_visible: event.leaderboard_visible,
      },
      progress,
      leaderboard,
    });
  } catch (error: any) {
    console.error("Leaderboard error:", error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: error.message },
      { status: 500 }
    );
  }
}
