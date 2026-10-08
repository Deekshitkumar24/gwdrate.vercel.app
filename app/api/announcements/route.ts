import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { Database } from "@/lib/db";

export async function GET(req: NextRequest) {
  await Database.ensureSynced();
  const announcements = Database.getAnnouncements();
  return NextResponse.json({ success: true, announcements });
}

export async function POST(req: NextRequest) {
  const session = getSession(req);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { title, content, type, pinned } = body;

    if (!title || !content) {
      return NextResponse.json({ error: "MISSING_FIELDS", message: "Title and content required." }, { status: 400 });
    }

    const item = await Database.postAnnouncement(
      {
        event_id: Database.getEvent().id,
        title,
        content,
        type: type || "ADMIN_ANNOUNCEMENT",
        pinned: Boolean(pinned),
      },
      session.email || "admin"
    );

    return NextResponse.json({ success: true, announcement: item });
  } catch (error: any) {
    return NextResponse.json(
      { error: "POST_ANNOUNCEMENT_FAILED", message: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = getSession(req);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });
  }

  await Database.deleteAnnouncement(id, session.email || "admin");
  return NextResponse.json({ success: true, message: "Announcement deleted." });
}
