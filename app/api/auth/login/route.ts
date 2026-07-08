import { NextResponse } from "next/server";
import { signJWT } from "@/app/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json().catch(() => ({}));

    const adminEmail = process.env.ADMIN_EMAIL || "admin@tracker.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "admin";

    if (email !== adminEmail || password !== adminPassword) {
      return NextResponse.json(
        { success: false, error: "Невірний email або пароль" },
        { status: 401 }
      );
    }

    // Sign JWT token
    const token = await signJWT({ email });

    // Set cookie
    const response = NextResponse.json({ success: true });
    
    // Cookie details: HTTP-Only, secure in production, maxAge 7 days
    response.cookies.set("session_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/"
    });

    return response;
  } catch (error: any) {
    console.error("Login API error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
