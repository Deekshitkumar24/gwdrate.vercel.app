import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { Database } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "leaderboard";

  const event = Database.getEvent();
  const teams = Database.getTeams();
  const approvedTeams = teams.filter((t) => t.status === "APPROVED");

  if (type === "matrix") {
    // Export full NxN rating matrix
    // Headers: Rater Code, Rater Name, ...Target Names...
    const headerRow = ["Rater Code", "Rater Name", ...approvedTeams.map((t) => `"${t.name} (${t.code})"` )].join(",");

    const rows: string[] = [headerRow];

    for (const rater of approvedTeams) {
      const raterRatings = Database.getRatingsForTeam(rater.id).filter((r) => r.status === "FINAL");
      const scoreMap = new Map<string, number>();
      for (const r of raterRatings) {
        scoreMap.set(r.target_team_id, r.score);
      }

      const rowValues = [
        `"${rater.code}"`,
        `"${rater.name}"`,
        ...approvedTeams.map((target) => {
          if (target.id === rater.id) return '"SELF"';
          const score = scoreMap.get(target.id);
          return score !== undefined ? score.toString() : '"N/A"';
        }),
      ];
      rows.push(rowValues.join(","));
    }

    const csvData = rows.join("\n");
    return new NextResponse(csvData, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${event.name.replace(/[^a-zA-Z0-9]/g, "_")}_matrix.csv"`,
      },
    });
  }

  // Default: Leaderboard CSV
  const leaderboard = Database.getLeaderboard();
  const header = "Rank,Team Code,Team Name,Average Score,Ratings Received,Tens Received,Nines Received\n";
  const rows = leaderboard.map((item) =>
    [
      item.rank,
      `"${item.teamCode}"`,
      `"${item.teamName.replace(/"/g, '""')}"`,
      item.avgScore.toFixed(2),
      item.ratingsReceived,
      item.tensReceived,
      item.ninesReceived,
    ].join(",")
  );

  const csvContent = header + rows.join("\n");
  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.name.replace(/[^a-zA-Z0-9]/g, "_")}_leaderboard.csv"`,
    },
  });
}
