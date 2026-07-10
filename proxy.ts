import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyJWT } from "./app/lib/auth";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Define public paths that do not require authentication
  const isPublicPage =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/invite/") ||
    pathname === "/privacy" ||
    pathname === "/terms";

  const isPublicApi =
    pathname === "/api/auth/login" ||
    pathname === "/api/auth/register" ||
    pathname === "/api/auth/facebook/callback" ||
    pathname === "/api/cron/sync" ||
    pathname === "/api/webhooks/facebook" ||
    pathname === "/api/webhooks/telegram";

  const isAsset =
    pathname.startsWith("/_next/") ||
    pathname.includes(".") || // e.g. favicon.ico, images
    pathname === "/favicon.ico";

  // Bypass public resources
  if (isPublicPage || isPublicApi || isAsset) {
    return NextResponse.next();
  }

  // Retrieve session token
  const token = req.cookies.get("session_token")?.value;

  // Verify the JWT token
  const verifiedPayload = token ? await verifyJWT(token) : null;

  if (!verifiedPayload) {
    // If not verified, redirect pages to /login or return 401 for API routes
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    
    // Redirect to login page
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  // Allow access
  return NextResponse.next();
}

// Configure middleware matcher to run on all routes except static assets
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth/login (handled in code above, but safe to exclude)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
