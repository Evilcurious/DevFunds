import { mkdirSync } from "node:fs";

type QueryClient = {
  mode: "neon" | "postgres" | "local";
  query: (text: string, params?: unknown[]) => Promise<unknown>;
};

const globalHolder = globalThis as unknown as {
  __devfundsClient?: QueryClient;
  __devfundsClientKey?: string;
};

export function connectionString(): string {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING ||
    ""
  ).trim();
}

export function getDbMode(): "neon" | "postgres" | "local" {
  const url = connectionString();
  if (!url) return "local";
  if (url.includes(".neon.tech")) return "neon";
  return "postgres";
}

async function createClient(): Promise<QueryClient> {
  const url = connectionString();

  if (url) {
    if (url.includes(".neon.tech")) {
      const { neon } = await import("@neondatabase/serverless");
      const sql = neon(url);
      return {
        mode: "neon",
        query: (text: string, params: unknown[] = []) => sql.query(text, params),
      };
    }

    const pgModule = await import("pg");
    const PoolClass =
      (pgModule as unknown as { default?: { Pool: typeof pgModule.Pool } })
        .default?.Pool ?? pgModule.Pool;
    const pool = new PoolClass({
      connectionString: url,
      max: 10,
      ssl:
        url.includes("sslmode=require") || url.includes("ssl=true")
          ? { rejectUnauthorized: false }
          : undefined,
    });
    return {
      mode: "postgres",
      query: (text: string, params: unknown[] = []) => pool.query(text, params),
    };
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const preferredDir = process.env.PGLITE_DATA_DIR || "/tmp/devfunds-pglite";
  try {
    mkdirSync(preferredDir, { recursive: true });
    const db = new PGlite(preferredDir);
    await db.query("SELECT 1");
    return {
      mode: "local",
      query: (text: string, params: unknown[] = []) => db.query(text, params),
    };
  } catch {
    const memDb = new PGlite();
    return {
      mode: "local",
      query: (text: string, params: unknown[] = []) => memDb.query(text, params),
    };
  }
}

async function getClient(): Promise<QueryClient> {
  const key = connectionString() || "__pglite__";
  if (globalHolder.__devfundsClient && globalHolder.__devfundsClientKey === key) {
    return globalHolder.__devfundsClient;
  }
  const client = await createClient();
  globalHolder.__devfundsClient = client;
  globalHolder.__devfundsClientKey = key;
  return client;
}

export async function rawQuery<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const client = await getClient();
  const result = await client.query(text, params);
  if (Array.isArray(result)) return result as T[];
  if (
    result &&
    typeof result === "object" &&
    Array.isArray((result as { rows?: unknown[] }).rows)
  ) {
    return (result as { rows: T[] }).rows;
  }
  return [];
}

export async function one<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await rawQuery<T>(text, params);
  return rows[0] ?? null;
}

export function toNum(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function toIso(value: unknown): string {
  if (!value) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
}

export function asJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}
