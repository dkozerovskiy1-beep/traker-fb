import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { id, name } = body;

    if (!id || !name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: id and name" },
        { status: 400 }
      );
    }

    // Update the name of the social account
    const updatedAccount = await db.fbSocialAccount.update({
      where: { id },
      data: { name: name.trim() }
    });

    return NextResponse.json({
      success: true,
      account: updatedAccount
    });
  } catch (error: any) {
    console.error("Error updating account name:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
