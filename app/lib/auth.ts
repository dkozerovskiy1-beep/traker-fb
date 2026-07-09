import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_PASSWORD || "varta_flow_fallback_secret_password_12345"
);

export async function signJWT(payload: { email: string }) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifyJWT(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { email: string };
  } catch (error) {
    return null;
  }
}

import { cookies } from "next/headers";
import { db } from "./db";

export async function getLoggedInUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session_token")?.value;
    if (!token) return null;

    const payload = await verifyJWT(token);
    if (!payload || !payload.email) return null;

    return await db.user.findUnique({
      where: { email: payload.email }
    });
  } catch (error) {
    return null;
  }
}
