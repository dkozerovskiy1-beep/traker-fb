import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { getLoggedInUser } from "@/app/lib/auth";

export async function POST(req: Request) {
  try {
    const user = await getLoggedInUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing social account ID" }, { status: 400 });
    }

    // Verify ownership
    const account = await db.fbSocialAccount.findUnique({
      where: { id }
    });

    if (!account || account.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: "Акаунт не знайдено або у вас немає прав на його видалення" },
        { status: 403 }
      );
    }

    // Delete the social account (cascades to ad accounts, pages, insights, rules, logs)
    await db.fbSocialAccount.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error disconnecting Facebook account:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to disconnect account" }, { status: 500 });
  }
}
