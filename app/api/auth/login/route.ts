import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { signJWT } from "@/app/lib/auth";
import { verifyPassword, hashPassword, isBcryptHash } from "@/app/lib/passwords";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json().catch(() => ({}));

    if (!email || !password) {
      return NextResponse.json({ success: false, error: "Введіть email та пароль" }, { status: 400 });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // 1. Attempt to find the user in the database
    const dbUser = await db.user.findUnique({
      where: { email: trimmedEmail }
    });

    let isValid = false;

    if (dbUser) {
      if (isBcryptHash(dbUser.password)) {
        isValid = await verifyPassword(password, dbUser.password);
      } else if (dbUser.password === password) {
        // Legacy plain-text match: allow login and seamlessly upgrade to bcrypt hash in DB
        isValid = true;
        const hashedPassword = await hashPassword(password);
        await db.user.update({
          where: { id: dbUser.id },
          data: { password: hashedPassword }
        }).catch(err => console.error("Failed to upgrade legacy password hash:", err));
      }
    } else {
      // Fallback check against environment variables for the admin account
      const adminEmail = (process.env.ADMIN_EMAIL || "admin@tracker.com").trim().toLowerCase();
      const adminPassword = process.env.ADMIN_PASSWORD || "admin";
      if (trimmedEmail === adminEmail && password === adminPassword) {
        isValid = true;
        const hashedPassword = await hashPassword(password);

        // Find existing admin record (either current adminEmail or legacy admin@tracker.com)
        const existingAdmin = await db.user.findFirst({
          where: { email: { in: ["admin@tracker.com", adminEmail] } }
        });

        if (existingAdmin) {
          await db.user.update({
            where: { id: existingAdmin.id },
            data: {
              email: adminEmail,
              password: hashedPassword
            }
          }).catch(err => console.error("Failed to update admin in DB:", err));
        } else {
          await db.user.create({
            data: {
              email: adminEmail,
              name: "Адміністратор",
              password: hashedPassword
            }
          }).catch(err => console.error("Failed to create admin in DB:", err));
        }
      }

      // Check for Meta App Review credentials from env or fallback
      const reviewerEmail = (process.env.REVIEWER_EMAIL || "reviewer@vartaflow.com").trim().toLowerCase();
      const reviewerPassword = process.env.REVIEWER_PASSWORD || "vartaflow_reviewer_2026";
      if (trimmedEmail === reviewerEmail && password === reviewerPassword) {
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
    const token = await signJWT({ email: trimmedEmail });

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
