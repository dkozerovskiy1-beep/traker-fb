import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { signJWT } from "@/app/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, password, name } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Будь ласка, вкажіть email та пароль" },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Check if email format is correct
    if (!trimmedEmail.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Некоректний формат email" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: trimmedEmail }
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "Користувач з таким email вже зареєстрований" },
        { status: 400 }
      );
    }

    // Create user in DB (Plain text password for consistency with current schema)
    const newUser = await db.user.create({
      data: {
        email: trimmedEmail,
        password,
        name: name || null
      }
    });

    // Create JWT session
    const token = await signJWT({ email: newUser.email });

    // Return response with auth cookie
    const response = NextResponse.json({ success: true });
    response.cookies.set("session_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/"
    });

    return response;
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
