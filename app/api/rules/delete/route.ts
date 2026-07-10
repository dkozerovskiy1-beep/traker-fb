import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { getLoggedInUser } from "@/app/lib/auth";

export async function DELETE(req: Request) {
  try {
    const user = await getLoggedInUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing required rule ID parameter" },
        { status: 400 }
      );
    }

    const rule = await db.moderationRule.findUnique({
      where: { id }
    });

    if (!rule || rule.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: "Правило не знайдено або у вас немає прав на його видалення" },
        { status: 403 }
      );
    }

    await db.moderationRule.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: "Rule deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting moderation rule:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
