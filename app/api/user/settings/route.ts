import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { getLoggedInUser } from "@/app/lib/auth";

/**
 * Update user settings (Telegram alerts settings & disconnection)
 * Route: POST /api/user/settings
 */
export async function POST(req: Request) {
  try {
    const user = await getLoggedInUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      alertOnBans,
      alertOnRejections,
      alertOnApprovals,
      alertOnComments,
      disconnectTelegram
    } = body;

    const dataToUpdate: any = {};

    if (alertOnBans !== undefined) dataToUpdate.alertOnBans = !!alertOnBans;
    if (alertOnRejections !== undefined) dataToUpdate.alertOnRejections = !!alertOnRejections;
    if (alertOnApprovals !== undefined) dataToUpdate.alertOnApprovals = !!alertOnApprovals;
    if (alertOnComments !== undefined) dataToUpdate.alertOnComments = !!alertOnComments;

    if (disconnectTelegram === true) {
      dataToUpdate.telegramChatId = null;
    }

    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: dataToUpdate
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        telegramChatId: updatedUser.telegramChatId,
        alertOnBans: updatedUser.alertOnBans,
        alertOnRejections: updatedUser.alertOnRejections,
        alertOnApprovals: updatedUser.alertOnApprovals,
        alertOnComments: updatedUser.alertOnComments
      }
    });
  } catch (error: any) {
    console.error("Error updating settings:", error);
    return NextResponse.json({ success: false, error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
