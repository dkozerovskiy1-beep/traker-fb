import { NextResponse } from "next/server";
import { getLoggedInUser } from "@/app/lib/auth";
import { db } from "@/app/lib/db";

export async function POST(req: Request) {
  try {
    const user = await getLoggedInUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { adAccountId, targetSocialAccountId, clientTag } = await req.json();

    if (!adAccountId) {
      return NextResponse.json({ success: false, error: "adAccountId is required" }, { status: 400 });
    }

    // 1. Verify that the ad account exists and belongs to the user
    const existingAdAccount = await db.fbAdAccount.findFirst({
      where: {
        id: adAccountId,
        socialAccount: { userId: user.id }
      },
      include: {
        socialAccount: true
      }
    });

    if (!existingAdAccount) {
      return NextResponse.json(
        { success: false, error: "Рекламний кабінет не знайдено або у вас немає прав доступу" },
        { status: 404 }
      );
    }

    // 2. If changing targetSocialAccountId, verify target social account belongs to the user
    if (targetSocialAccountId && targetSocialAccountId !== existingAdAccount.socialAccountId) {
      const targetSocialAccount = await db.fbSocialAccount.findFirst({
        where: {
          id: targetSocialAccountId,
          userId: user.id
        }
      });

      if (!targetSocialAccount) {
        return NextResponse.json(
          { success: false, error: "Цільовий профіль клієнта не знайдено" },
          { status: 404 }
        );
      }
    }

    // 3. Update the ad account
    const updateData: { socialAccountId?: string; clientTag?: string | null } = {};
    if (targetSocialAccountId) {
      updateData.socialAccountId = targetSocialAccountId;
    }
    if (clientTag !== undefined) {
      updateData.clientTag = typeof clientTag === "string" ? clientTag.trim() || null : null;
    }

    const updatedAccount = await db.fbAdAccount.update({
      where: { id: adAccountId },
      data: updateData,
      include: {
        socialAccount: {
          select: { id: true, name: true }
        }
      }
    });

    return NextResponse.json({
      success: true,
      adAccount: {
        id: updatedAccount.id,
        name: updatedAccount.name,
        socialAccountId: updatedAccount.socialAccountId,
        socialAccountName: updatedAccount.socialAccount.name,
        clientTag: updatedAccount.clientTag
      }
    });
  } catch (error: any) {
    console.error("Failed to reassign ad account:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to reassign ad account" },
      { status: 500 }
    );
  }
}
