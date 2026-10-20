import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "./db";

// Primary JWT signing secret (prefers dedicated APP_SECRET / JWT_SECRET)
const primarySecret =
  process.env.APP_SECRET ||
  process.env.JWT_SECRET ||
  process.env.ADMIN_PASSWORD ||
  "varta_flow_fallback_secret_password_12345";

const JWT_SECRET = new TextEncoder().encode(primarySecret);

// Fallback secret for seamless backward compatibility of existing active sessions
const legacySecret = process.env.ADMIN_PASSWORD
  ? new TextEncoder().encode(process.env.ADMIN_PASSWORD)
  : null;

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
    // If primary verification failed, attempt fallback to legacy secret for zero session interruption
    if (legacySecret) {
      try {
        const { payload } = await jwtVerify(token, legacySecret);
        return payload as { email: string };
      } catch {
        return null;
      }
    }
    return null;
  }
}

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
