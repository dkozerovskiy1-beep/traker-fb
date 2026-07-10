import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { signJWT } from "@/app/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json().catch(() => ({}));

    if (!email || !password) {
      return NextResponse.json({ success: false, error: "Введіть email та пароль" }, { status: 400 });
    }

    // 1. Ensure the reviewer account exists in the database
    const reviewerEmail = "reviewer@vartaflow.com";
    const reviewerPass = "vartaflow_reviewer_2026";
    await db.user.upsert({
      where: { email: reviewerEmail },
      update: { password: reviewerPass },
      create: {
        email: reviewerEmail,
        password: reviewerPass,
        name: "App Reviewer"
      }
    });

    // 2. Attempt to find the user in the database
    const dbUser = await db.user.findUnique({
      where: { email }
    });

    let isValid = false;

    if (dbUser && dbUser.password === password) {
      isValid = true;
    } else {
      // Fallback check against environment variables for the legacy admin account
      const adminEmail = process.env.ADMIN_EMAIL || "admin@tracker.com";
      const adminPassword = process.env.ADMIN_PASSWORD || "admin";
      if (email === adminEmail && password === adminPassword) {
        isValid = true;
      }
    }

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Невірний email або пароль" },
        { status: 401 }
      );
    }

    // Sign JWT token
    const token = await signJWT({ email });

    // Set cookie
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
    console.error("Login API error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
