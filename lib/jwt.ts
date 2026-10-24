import { SignJWT, jwtVerify } from "jose";
import type { PortalRole } from "./types";

export const SESSION_COOKIE = "devfunds_session";

export interface SessionPayload {
  sub: string;
  role: PortalRole;
  ver: number;
}

function rawSecretSeed(): string {
  const dbUrl = (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING ||
    ""
  ).trim();
  const seed =
    process.env.AUTH_SECRET || dbUrl || "devfunds-local-dev-secret-key";
  return `devfunds-jwt-v1:${seed}`;
}

async function getSecretBytes(): Promise<Uint8Array> {
  const encoded = new TextEncoder().encode(rawSecretSeed());
  const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", encoded);
  return new Uint8Array(hashBuffer);
}

export async function signSessionToken(
  payload: SessionPayload
): Promise<string> {
  const secret = await getSecretBytes();
  return new SignJWT({ role: payload.role, ver: payload.ver })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const secret = await getSecretBytes();
    const { payload } = await jwtVerify(token, secret);
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
