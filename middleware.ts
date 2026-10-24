import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "./lib/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow static files, public brand logos, Next internals & auth endpoints
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth/") ||
    pathname === "/favicon.ico" ||
    pathname === "/icon.png" ||
    /\.(png|jpg|jpeg|svg|webp|ico|woff2?|ttf|otf)$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  // Protect all API data routes when not signed in
  if (pathname.startsWith("/api/")) {
    if (!session) {
      return NextResponse.json(
        { error: "Please log in to a portal to view data." },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // Allow /portals login gate when signed out; redirect all other pages to /portals!
  if (!session && pathname !== "/portals") {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/portals";
    loginUrl.search = "";
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
