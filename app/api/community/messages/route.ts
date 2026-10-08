import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { Database } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "Community access is available to approved event members." }, { status: 401 });
  }

  await Database.ensureSynced();

  // Strict access: Only approved teams and admins can access the private community
  if (session.role === "team" && session.teamId) {
    const team = Database.getTeamById(session.teamId);
    if (!team || team.status !== "APPROVED") {
      return NextResponse.json({
        error: "ACCESS_DENIED",
        message: "Community access is restricted to approved event teams.",
      }, { status: 403 });
    }
  }

  const { searchParams } = new URL(req.url);
  const channel = searchParams.get("channel") || undefined;
  const messages = Database.getCommunityMessages(channel);

  return NextResponse.json({ success: true, messages });
}

export async function POST(req: NextRequest) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  let authorName = "Organizer";
  let authorTeamCode = "ADMIN";
  let authorRole: "admin" | "leader" | "member" = "admin";
  let authorId = "admin";

  if (session.role === "team" && session.teamId) {
    const team = Database.getTeamById(session.teamId);
    if (!team || team.status !== "APPROVED") {
      return NextResponse.json({
        error: "ACCESS_DENIED",
        message: "Only approved teams can participate in the community.",
      }, { status: 403 });
    }
    authorName = team.leader_name;
    authorTeamCode = team.code;
    authorRole = "leader";
    authorId = team.id;
  }

  try {
    const body = await req.json();
    const { content, channel, is_announcement, is_pinned, reply_to_id } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "EMPTY_MESSAGE", message: "Message content cannot be blank." }, { status: 400 });
    }

    // Only admin can post official announcements or pin
    const isAdmin = session.role === "admin";
    const msg = await Database.postCommunityMessage({
      event_id: Database.getEvent().id,
      author_id: authorId,
      author_name: authorName,
      author_team_code: authorTeamCode,
      author_role: authorRole,
      channel: channel || "general",
      content: content.trim(),
      is_announcement: Boolean(isAdmin && is_announcement),
      is_pinned: Boolean(isAdmin && is_pinned),
      reply_to_id: reply_to_id || null,
    });

    return NextResponse.json({ success: true, message: msg });
  } catch (error: any) {
    return NextResponse.json(
      { error: "POST_FAILED", message: error.message || "Failed to post message." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const messageId = searchParams.get("messageId");
  if (!messageId) {
    return NextResponse.json({ error: "MISSING_MESSAGE_ID" }, { status: 400 });
  }

  // Admin can delete any message; user can delete their own
  const messages = Database.getCommunityMessages();
  const target = messages.find((m) => m.id === messageId);
  if (!target) {
    return NextResponse.json({ error: "MESSAGE_NOT_FOUND" }, { status: 404 });
  }

  if (session.role !== "admin" && target.author_id !== session.teamId) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  await Database.deleteCommunityMessage(messageId, session.email || session.teamCode || "actor");
  return NextResponse.json({ success: true, message: "Message deleted." });
}

export async function PUT(req: NextRequest) {
  const session = getSession(req);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { messageId, is_pinned } = body;
    if (!messageId) {
      return NextResponse.json({ error: "MISSING_MESSAGE_ID" }, { status: 400 });
    }

    await Database.pinCommunityMessage(messageId, Boolean(is_pinned), session.email || "admin");
    return NextResponse.json({ success: true, message: "Pin status updated." });
  } catch (error: any) {
    return NextResponse.json(
      { error: "PIN_FAILED", message: error.message },
      { status: 500 }
    );
  }
}
