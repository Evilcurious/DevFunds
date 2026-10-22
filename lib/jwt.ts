import { createHash } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { connectionString } from "./db";
import type { PortalRole } from "./types";

export const SESSION_COOKIE = "devfunds_session";

export interface SessionPayload {
  sub: string;
  role: PortalRole;
  ver: number;
}

function getSecretBytes(): Uint8Array {
  const seed =
    process.env.AUTH_SECRET ||
    connectionString() ||
    "devfunds-local-dev-secret-key";
  const digest = createHash("sha256")
    .update(`devfunds-jwt-v1:${seed}`)
    .digest();
  return new Uint8Array(digest);
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ role: payload.role, ver: payload.ver })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecretBytes());
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretBytes());
    if (
      typeof payload.sub !== "string" ||
      typeof payload.role !== "string" ||
      typeof payload.ver !== "number"
    ) {
      return null;
    }
    return {
      sub: payload.sub,
      role: payload.role as PortalRole,
      ver: payload.ver,
    };
  } catch {
    return null;
  }
}
