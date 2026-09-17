import { NextResponse } from "next/server";
import { getLoggedInUser } from "@/app/lib/auth";
import { db } from "@/app/lib/db";

export async function POST(req: Request) {
  const user = await getLoggedInUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { socialAccountId, clientTag } = await req.json();

    if (!socialAccountId) {
      return NextResponse.json({ success: false, error: "socialAccountId is required" }, { status: 400 });
    }

    // Verify ownership
    const socialAccount = await db.fbSocialAccount.findFirst({
      where: {
        id: socialAccountId,
        userId: user.id
      }
    });

    if (!socialAccount) {
      return NextResponse.json(
        { success: false, error: "Профіль не знайдено або у вас немає прав доступу" },
        { status: 404 }
      );
    }

    const tagValue = typeof clientTag === "string" ? clientTag.trim() || null : null;

    const updatedAccount = await db.fbSocialAccount.update({
      where: { id: socialAccountId },
      data: { clientTag: tagValue }
    });

    return NextResponse.json({
      success: true,
      socialAccount: {
        id: updatedAccount.id,
        name: updatedAccount.name,
        clientTag: updatedAccount.clientTag
      }
    });
  } catch (error: any) {
    console.error("Failed to update social account tag:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update tag" },
      { status: 500 }
    );
  }
}
