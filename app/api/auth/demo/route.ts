import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { signJWT } from "@/app/lib/auth";

export async function POST(req: Request) {
  try {
    const { passcode } = await req.json().catch(() => ({}));

    // Simple passcode verification to protect access
    if (passcode !== "vartaflow_reviewer_access_2026") {
      return NextResponse.json({ success: false, error: "Невірний демо-код" }, { status: 401 });
    }

    // Find the main user (first registered user in the DB)
    const mainUser = await db.user.findFirst({
      orderBy: { createdAt: "asc" }
    });

    if (!mainUser) {
      return NextResponse.json({ success: false, error: "Користувачів у системі не знайдено" }, { status: 404 });
    }

    // Sign JWT token using the main user's email
    const token = await signJWT({ email: mainUser.email });

    // Create response and set cookie
    const response = NextResponse.json({ success: true });
    response.cookies.set("session_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/"
    });

    return response;
  } catch (error: any) {
    console.error("Demo login error:", error);
    return NextResponse.json({ success: false, error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
