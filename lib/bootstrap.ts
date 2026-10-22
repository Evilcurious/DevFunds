import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { DEFAULT_SETTINGS, INITIAL_PORTAL_ACCOUNTS } from "./constants";
import { asJson, one, rawQuery } from "./db";
import { runMigrations } from "./schema";
import { ROYAL_THEMES } from "./themes";
import type {
  AppSettings,
  CurrencyCode,
  CustomThemePalette,
  ThemePresetId,
  UploadedFont,
} from "./types";

const globalBoot = globalThis as unknown as {
  __devfundsBootPromise?: Promise<void>;
};

const VALID_THEMES: ThemePresetId[] = [
  "imperial_sapphire",
  "ivory_sovereign",
  "obsidian_gold",
  "emerald_dynasty",
  "burgundy_crown",
  "pearl_platinum",
  "amethyst_regency",
  "custom",
];

function sanitizeHex(val: unknown, fallback: string): string {
  if (typeof val === "string" && /^#[0-9a-fA-F]{3,8}$/.test(val.trim())) {
    return val.trim();
  }
  return fallback;
}

export function normalizeSettings(raw: unknown): AppSettings {
  const obj = asJson<Partial<AppSettings>>(raw, {});
  const validCurrencies: CurrencyCode[] = ["PKR", "USD", "AED", "GBP", "EUR"];
  const currency = validCurrencies.includes(obj.currency as CurrencyCode)
    ? (obj.currency as CurrencyCode)
    : DEFAULT_SETTINGS.currency;

  const themeId = VALID_THEMES.includes(obj.themeId as ThemePresetId)
    ? (obj.themeId as ThemePresetId)
    : DEFAULT_SETTINGS.themeId;

  const rawPalette = (obj.customTheme || {}) as Partial<CustomThemePalette>;
  const defPalette = ROYAL_THEMES[0].palette;
  const customTheme: CustomThemePalette = {
    bgCanvas: sanitizeHex(rawPalette.bgCanvas, defPalette.bgCanvas),
    bgSurface: sanitizeHex(rawPalette.bgSurface, defPalette.bgSurface),
    bgElevated: sanitizeHex(rawPalette.bgElevated, defPalette.bgElevated),
    borderSubtle: sanitizeHex(rawPalette.borderSubtle, defPalette.borderSubtle),
    accentPrimary: sanitizeHex(
      rawPalette.accentPrimary,
      defPalette.accentPrimary
    ),
    accentSecondary: sanitizeHex(
      rawPalette.accentSecondary,
      defPalette.accentSecondary
    ),
    textPrimary: sanitizeHex(rawPalette.textPrimary, defPalette.textPrimary),
    textMuted: sanitizeHex(rawPalette.textMuted, defPalette.textMuted),
  };

  const customFonts: UploadedFont[] = Array.isArray(obj.customFonts)
    ? obj.customFonts
        .filter(
          (f) =>
            f &&
            typeof f.id === "string" &&
            typeof f.name === "string" &&
            typeof f.dataUrl === "string"
        )
        .slice(0, 12)
    : [];

  return {
    companyName:
      typeof obj.companyName === "string" && obj.companyName.trim()
        ? obj.companyName.trim().slice(0, 60)
        : DEFAULT_SETTINGS.companyName,
    logoUrl:
      typeof obj.logoUrl === "string" && obj.logoUrl.trim()
        ? obj.logoUrl.trim()
        : DEFAULT_SETTINGS.logoUrl,
    currency,
    timezone:
      typeof obj.timezone === "string" && obj.timezone.trim()
        ? obj.timezone.trim()
        : DEFAULT_SETTINGS.timezone,
    language: obj.language === "ur" ? "ur" : "en",
    themeId,
    customTheme,
    textColorOverride:
      typeof obj.textColorOverride === "string" &&
      /^#[0-9a-fA-F]{3,8}$/.test(obj.textColorOverride.trim())
        ? obj.textColorOverride.trim()
        : "",
    fontId:
      typeof obj.fontId === "string" && obj.fontId.trim()
        ? obj.fontId.trim()
        : DEFAULT_SETTINGS.fontId,
    customFonts,
  };
}

async function seedCoreStructure(): Promise<void> {
  await rawQuery(
    `INSERT INTO df_settings (key, value)
     VALUES ('app', $1::jsonb)
     ON CONFLICT (key) DO NOTHING`,
    [JSON.stringify(DEFAULT_SETTINGS)]
  );

  // One-time upgrade: apply uploaded DEVZARD official logo on existing DB if still empty/default
  const brandFlag = await one<{ key: string }>(
    `SELECT key FROM df_settings WHERE key = 'brand_devzard_v3' LIMIT 1`
  );
  if (!brandFlag) {
    const appRow = await one<{ value: unknown }>(
      `SELECT value FROM df_settings WHERE key = 'app' LIMIT 1`
    );
    const current = normalizeSettings(appRow?.value);
    const rawObj = asJson<Record<string, unknown>>(appRow?.value, {});
    const updated: AppSettings = {
      ...current,
      logoUrl:
        typeof rawObj.logoUrl === "string" && rawObj.logoUrl.trim()
          ? rawObj.logoUrl.trim()
          : "/devzard-logo.png",
      companyName:
        !rawObj.companyName || rawObj.companyName === "DevFunds"
          ? "DEVZARD"
          : String(rawObj.companyName),
    };
    await rawQuery(
      `UPDATE df_settings SET value = $1::jsonb, updated_at = NOW() WHERE key = 'app'`,
      [JSON.stringify(updated)]
    );
    await rawQuery(
      `INSERT INTO df_settings (key, value) VALUES ('brand_devzard_v3', $1::jsonb) ON CONFLICT (key) DO NOTHING`,
      [JSON.stringify({ upgradedAt: new Date().toISOString() })]
    );
  }

  const initFlag = await one<{ key: string }>(
    `SELECT key FROM df_settings WHERE key = 'initialized_v1' LIMIT 1`
  );

  if (!initFlag) {
    const coreSections = [
      {
        id: "sec_bd",
        slug: "bd",
        name: "BD",
        description: "Business Development",
        color: "sky",
        isSystem: false,
        sortOrder: 1,
      },
      {
        id: "sec_it",
        slug: "it",
        name: "IT",
        description: "Information Technology",
        color: "blue",
        isSystem: false,
        sortOrder: 2,
      },
    ];

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
