import { NextResponse } from "next/server";
import { getLoggedInUser } from "@/app/lib/auth";
import { db } from "@/app/lib/db";

export async function POST(req: Request) {
  const user = await getLoggedInUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { adAccountId, clientTag } = await req.json();

    if (!adAccountId) {
      return NextResponse.json({ success: false, error: "adAccountId is required" }, { status: 400 });
    }

    const tagValue = typeof clientTag === "string" ? clientTag.trim() : null;

    const adAccount = await db.fbAdAccount.update({
      where: { id: adAccountId },
      data: { clientTag: tagValue }
    });

    return NextResponse.json({
      success: true,
      adAccount: {
        id: adAccount.id,
        name: adAccount.name,
        clientTag: adAccount.clientTag
      }
    });
  } catch (error: any) {
    console.error("Failed to update client tag:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to update tag" }, { status: 500 });
  }
}
