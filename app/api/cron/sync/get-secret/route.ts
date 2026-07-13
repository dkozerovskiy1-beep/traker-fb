import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ secret: process.env.CRON_SECRET || "not_set" });
}
