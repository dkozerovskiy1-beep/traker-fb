import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing required rule ID parameter" },
        { status: 400 }
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
