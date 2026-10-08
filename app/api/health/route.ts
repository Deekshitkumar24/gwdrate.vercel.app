import { NextResponse } from "next/server";
import { Database } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await Database.ensureSynced();
    const event = Database.getEvent();
    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      mongoConnected: Boolean(process.env.MONGODB_URI),
      event: {
        id: event.id,
        name: event.name,
        status: event.status,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: "unhealthy", error: error.message },
      { status: 500 }
    );
  }
}
