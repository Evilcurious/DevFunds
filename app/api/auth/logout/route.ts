import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/jwt";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const isHttps =
    request.headers.get("x-forwarded-proto") === "https" ||
    request.url.startsWith("https://");
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps,
    path: "/",
    maxAge: 0,
  });
  return response;
}
