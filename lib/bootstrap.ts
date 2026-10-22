import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { DEFAULT_SETTINGS, INITIAL_PORTAL_ACCOUNTS } from "./constants";
import { asJson, one, rawQuery } from "./db";
import { runMigrations } from "./schema";
import type { AppSettings, CurrencyCode } from "./types";

const globalBoot = globalThis as unknown as {
  __devfundsBootPromise?: Promise<void>;
};

export function normalizeSettings(raw: unknown): AppSettings {
  const obj = asJson<Partial<AppSettings>>(raw, {});
  const validCurrencies: CurrencyCode[] = ["PKR", "USD", "AED", "GBP", "EUR"];
  const currency = validCurrencies.includes(obj.currency as CurrencyCode)
    ? (obj.currency as CurrencyCode)
    : DEFAULT_SETTINGS.currency;

  return {
    companyName:
      typeof obj.companyName === "string" && obj.companyName.trim()
        ? obj.companyName.trim()
        : DEFAULT_SETTINGS.companyName,
    tagline:
      typeof obj.tagline === "string" && obj.tagline.trim()
        ? obj.tagline.trim()
        : DEFAULT_SETTINGS.tagline,
    currency,
    timezone:
      typeof obj.timezone === "string" && obj.timezone.trim()
        ? obj.timezone.trim()
        : DEFAULT_SETTINGS.timezone,
    showSetupHint:
      typeof obj.showSetupHint === "boolean"
        ? obj.showSetupHint
        : DEFAULT_SETTINGS.showSetupHint,
  };
}

async function seedCoreStructure(): Promise<void> {
  // 1. Default workspace settings (PKR currency by default, clean zero state)
  await rawQuery(
    `INSERT INTO df_settings (key, value)
     VALUES ('app', $1::jsonb)
     ON CONFLICT (key) DO NOTHING`,
    [JSON.stringify(DEFAULT_SETTINGS)]
  );

  // 2. Default two sections: BD & IT (can add more, divide, or remove later)
  const coreSections = [
    {
      id: "sec_bd",
      slug: "bd",
      name: "BD",
      description: "Business Development, Client Acquisition & Sales Closing",
      color: "sky",
      isSystem: false,
      sortOrder: 1,
    },
    {
      id: "sec_it",
      slug: "it",
      name: "IT",
      description: "Software Engineering, Design, Cloud & Delivery Team",
      color: "blue",
      isSystem: false,
      sortOrder: 2,
    },
  ];

  // Seed default sections only on initial setup so ERP Owner can rename/remove if desired
  const initFlag = await one<{ key: string }>(
    `SELECT key FROM df_settings WHERE key = 'initialized_v1' LIMIT 1`
  );

  if (!initFlag) {
    for (const sec of coreSections) {
      await rawQuery(
        `INSERT INTO df_sections (id, slug, name, description, color, is_system, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (slug) DO NOTHING`,
        [
          sec.id,
          sec.slug,
          sec.name,
          sec.description,
          sec.color,
          sec.isSystem,
          sec.sortOrder,
        ]
      );
    }

    // 3. Seed ONLY the 3 leadership portal accounts (0 customers, 0 earning, 0 spending, 0 staff)
    for (const acct of INITIAL_PORTAL_ACCOUNTS) {
      const hash = bcrypt.hashSync(acct.defaultPassword, 10);
      await rawQuery(
        `INSERT INTO df_users (
           id, name, email, password_hash, portal_role, job_title, section_slug, staff_status
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
         ON CONFLICT (email) DO NOTHING`,
        [
          randomUUID(),
          acct.name,
          acct.email.toLowerCase(),
          hash,
          acct.portalRole,
          acct.jobTitle,
          acct.sectionSlug,
        ]
      );
    }

    await rawQuery(
      `INSERT INTO df_settings (key, value)
       VALUES ('initialized_v1', $1::jsonb)
       ON CONFLICT (key) DO NOTHING`,
      [JSON.stringify({ initializedAt: new Date().toISOString() })]
    );
  }
}

export async function ensureBootstrapped(): Promise<void> {
  if (!globalBoot.__devfundsBootPromise) {
    globalBoot.__devfundsBootPromise = (async () => {
      await runMigrations();
      await seedCoreStructure();
    })().catch((err) => {
      globalBoot.__devfundsBootPromise = undefined;
      throw err;
    });
  }
  await globalBoot.__devfundsBootPromise;
}

export async function getAppSettings(): Promise<AppSettings> {
  await ensureBootstrapped();
  const row = await one<{ value: unknown }>(
    `SELECT value FROM df_settings WHERE key = 'app' LIMIT 1`
  );
  return normalizeSettings(row?.value);
}
