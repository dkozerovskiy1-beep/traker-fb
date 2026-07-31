import { NextResponse } from "next/server";
import { getLoggedInUser } from "@/app/lib/auth";
import { db } from "@/app/lib/db";
import crypto from "crypto";

export async function GET() {
  const user = await getLoggedInUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { exportApiKey: true }
  });

  return NextResponse.json({
    success: true,
    apiKey: dbUser?.exportApiKey || null
  });
}

export async function POST() {
  const user = await getLoggedInUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  // Generate a secure API Key e.g. varta_live_...
  const newApiKey = `varta_live_${crypto.randomBytes(24).toString("hex")}`;

  const updatedUser = await db.user.update({
    where: { id: user.id },
    data: { exportApiKey: newApiKey },
    select: { exportApiKey: true }
  });

  return NextResponse.json({
    success: true,
    apiKey: updatedUser.exportApiKey
  });
}
