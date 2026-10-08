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
    const { csvContent, teamsList } = body;

    let parsedTeams: Array<{ name: string; leader_name?: string; contact?: string }> = [];

    if (Array.isArray(teamsList) && teamsList.length > 0) {
      parsedTeams = teamsList;
    } else if (typeof csvContent === "string" && csvContent.trim()) {
      // Simple resilient CSV parser (supports commas, semicolons, tabs)
      const lines = csvContent.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      for (const line of lines) {
        // Skip header if line starts with name
        if (line.toLowerCase().startsWith("team name") || line.toLowerCase().startsWith("name,")) {
          continue;
        }
        const delimiter = line.includes("\t") ? "\t" : line.includes(";") ? ";" : ",";
        const parts = line.split(delimiter).map((p) => p.replace(/^["']|["']$/g, "").trim());
        if (parts[0]) {
          parsedTeams.push({
            name: parts[0],
            leader_name: parts[1] || "Team Leader",
            contact: parts[2] || "team@event.local",
          });
        }
      }
    }

    if (parsedTeams.length === 0) {
      return NextResponse.json(
        { error: "NO_TEAMS_FOUND", message: "No valid teams found in import payload." },
        { status: 400 }
      );
    }

    const imported = await Database.importTeams(parsedTeams, session.email || "admin");
    return NextResponse.json({
      success: true,
      importedCount: imported.length,
      teams: imported,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "IMPORT_FAILED", message: error.message },
      { status: 500 }
    );
  }
}
