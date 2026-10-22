"use client";

import React, { useEffect, useState } from "react";
import { Check, Crown, ImagePlus, Save, Type, Upload, X } from "lucide-react";
import { useApp } from "@/components/app-context";
import { CURRENCIES } from "@/lib/constants";
import {
  BUILTIN_FONTS,
  ROYAL_THEMES,
  TEXT_COLOR_SWATCHES,
} from "@/lib/themes";
import type {
  CurrencyCode,
  CustomThemePalette,
  LanguageCode,
  ThemePresetId,
  UploadedFont,
} from "@/lib/types";

export function OwnerStudioPanel() {
  const {
    settings,
    setSettings,
    clearVisitorOverrides,
    toast,
  } = useApp();

  const [companyName, setCompanyName] = useState(settings.companyName);
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl);
  const [currency, setCurrency] = useState<CurrencyCode>(settings.currency);
  const [language, setLanguage] = useState<LanguageCode>(settings.language);
  const [themeId, setThemeId] = useState<ThemePresetId>(settings.themeId);
  const [customTheme, setCustomTheme] = useState<CustomThemePalette>(
    settings.customTheme
  );
  const [textColorOverride, setTextColorOverride] = useState(
    settings.textColorOverride
  );
  const [fontId, setFontId] = useState(settings.fontId);
  const [customFonts, setCustomFonts] = useState<UploadedFont[]>(
    settings.customFonts || []
  );
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCompanyName(settings.companyName);
    setLogoUrl(settings.logoUrl);
    setCurrency(settings.currency);
    setLanguage(settings.language);
    setThemeId(settings.themeId);
    setCustomTheme(settings.customTheme);
    setTextColorOverride(settings.textColorOverride);
    setFontId(settings.fontId);
    setCustomFonts(settings.customFonts || []);
  }, [settings]);

  // Resize logo image cleanly to crisp <=256px PNG data URL so Neon DB storage stays tiny & fast
  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === "image/svg+xml") {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setLogoUrl(reader.result);
          toast("SVG logo ready — click Save Changes to publish.");
        }
      };
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxSide = 256;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          setLogoUrl(canvas.toDataURL("image/png", 0.92));
          toast("Logo uploaded — click Save Changes to apply globally.");
        }
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Upload custom TTF / OTF / WOFF / WOFF2 font file
  const handleFontFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2.6 * 1024 * 1024) {
      toast("Font file must be under 2.5 MB.", "error");
      return;
    }
    const cleanName = file.name.replace(/\.(ttf|otf|woff2?)$/i, "");
    const id = `uf_${Date.now().toString(36)}`;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        const nextFont: UploadedFont = {
          id,
          name: cleanName,
          dataUrl: reader.result,
        };
        setCustomFonts((prev) => [...prev, nextFont]);
        setFontId(id);
        toast(`Font "${cleanName}" uploaded! Click Save Changes.`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveStudio = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          logoUrl,
          currency,
          language,
          themeId,
          customTheme,
          textColorOverride,
          fontId,
          customFonts,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.settings) {
        clearVisitorOverrides();
        setSettings(data.settings);
        toast("Brand, font, theme & language published globally!");
      } else {
        toast(data.error || "Failed to save studio settings", "error");
      }

      if (newPassword.trim()) {
        const pwRes = await fetch("/api/auth/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newPassword: newPassword.trim() }),
        });
        if (pwRes.ok) {
          setNewPassword("");
          toast("Password updated!");
        }
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSaveStudio} className="space-y-6">
      {/* 1. Brand Identity: Website Name + Logo URL or Upload + Language & Currency */}
      <div className="royal-card rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
          <div className="flex items-center gap-2.5">
            <Crown className="h-5 w-5 gold-accent" />
            <h3 className="text-base font-bold">Brand, Logo & Language</h3>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="royal-btn inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? "Saving..." : "Save Changes"}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
              Website Name
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="royal-input w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
              Default Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as LanguageCode)}
              className="royal-input w-full"
            >
              <option value="en">English</option>
              <option value="ur">اردو (Urdu)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
              Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
              className="royal-input w-full"
            >
              {Object.values(CURRENCIES).map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Logo URL + File Upload */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center pt-2">
          <div className="md:col-span-2 flex justify-center">
            {logoUrl ? (
              <div className="relative">
                <img
                  src={logoUrl}
                  alt="Logo preview"
                  className="h-16 w-16 rounded-xl object-contain border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-1.5"
                />
                <button
                  type="button"
                  onClick={() => setLogoUrl("")}
                  title="Reset logo"
                  className="absolute -top-2 -right-2 rounded-full bg-rose-600 p-1 text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="royal-elevated flex h-16 w-16 items-center justify-center rounded-xl">
                <Crown className="h-7 w-7 gold-accent" />
              </div>
            )}
          </div>

          <div className="md:col-span-6">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
              Logo URL
            </label>
            <input
              type="text"
              placeholder="https://example.com/logo.png"
              value={logoUrl.startsWith("data:") ? "" : logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              className="royal-input w-full"
            />
          </div>

          <div className="md:col-span-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
              Or Upload Logo File
            </label>
            <label className="royal-btn-outline flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm cursor-pointer">
              <ImagePlus className="h-4 w-4 gold-accent" />
              <span>Upload Logo</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* 2. 7 Royal Preset Themes + Custom Theme + Text Color Selector */}
      <div className="royal-card rounded-2xl p-6 space-y-5">
        <h3 className="text-base font-bold border-b border-[var(--border-subtle)] pb-3">
          7 Royal Themes, Custom Theme & Text Color
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {ROYAL_THEMES.map((preset) => {
            const active = themeId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setThemeId(preset.id);
                  setCustomTheme(preset.palette);
                }}
                style={{
                  backgroundColor: preset.palette.bgSurface,
                  borderColor: active
                    ? preset.palette.accentSecondary
                    : preset.palette.borderSubtle,
                  color: preset.palette.textPrimary,
                }}
                className="rounded-xl border p-4 text-start space-y-2.5 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-4 w-4 rounded-full border border-white/25"
                      style={{ backgroundColor: preset.palette.bgCanvas }}
                    />
                    <span
                      className="h-4 w-4 rounded-full border border-white/25"
                      style={{ backgroundColor: preset.palette.accentPrimary }}
                    />
                    <span
                      className="h-4 w-4 rounded-full border border-white/25"
                      style={{
                        backgroundColor: preset.palette.accentSecondary,
                      }}
                    />
                  </div>
                  {active && (
                    <Check
                      className="h-4 w-4"
                      style={{ color: preset.palette.accentSecondary }}
                    />
                  )}
                </div>
                <div className="text-sm font-bold">{preset.name}</div>
              </button>
            );
          })}
        </div>

        {/* Custom Theme Palette & Custom Text Color */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
          <label className="royal-elevated rounded-xl p-3 text-xs space-y-1.5">
            <span className="block font-semibold">Canvas Color</span>
            <input
              type="color"
              value={customTheme.bgCanvas}
              onChange={(e) => {
                setThemeId("custom");
                setCustomTheme((p) => ({ ...p, bgCanvas: e.target.value }));
              }}
              className="h-9 w-full rounded cursor-pointer bg-transparent"
            />
          </label>

          <label className="royal-elevated rounded-xl p-3 text-xs space-y-1.5">
            <span className="block font-semibold">Card Color</span>
            <input
              type="color"
              value={customTheme.bgSurface}
              onChange={(e) => {
                setThemeId("custom");
                setCustomTheme((p) => ({
                  ...p,
                  bgSurface: e.target.value,
                  bgElevated: e.target.value,
                }));
              }}
              className="h-9 w-full rounded cursor-pointer bg-transparent"
            />
          </label>

          <label className="royal-elevated rounded-xl p-3 text-xs space-y-1.5">
            <span className="block font-semibold">Primary Color</span>
            <input
              type="color"
              value={customTheme.accentPrimary}
              onChange={(e) => {
                setThemeId("custom");
                setCustomTheme((p) => ({
                  ...p,
                  accentPrimary: e.target.value,
                }));
              }}
              className="h-9 w-full rounded cursor-pointer bg-transparent"
            />
          </label>

          <label className="royal-elevated rounded-xl p-3 text-xs space-y-1.5">
            <span className="block font-semibold">Royal Trim</span>
            <input
              type="color"
              value={customTheme.accentSecondary}
              onChange={(e) => {
                setThemeId("custom");
                setCustomTheme((p) => ({
                  ...p,
                  accentSecondary: e.target.value,
                }));
              }}
              className="h-9 w-full rounded cursor-pointer bg-transparent"
            />
          </label>

          <label className="royal-elevated rounded-xl p-3 text-xs space-y-1.5">
            <span className="block font-semibold">Text Color</span>
            <input
              type="color"
              value={textColorOverride || customTheme.textPrimary}
              onChange={(e) => setTextColorOverride(e.target.value)}
              className="h-9 w-full rounded cursor-pointer bg-transparent"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {TEXT_COLOR_SWATCHES.map((sw) => (
            <button
              key={sw.label}
              type="button"
              onClick={() => setTextColorOverride(sw.value)}
              className="royal-btn-outline rounded-lg px-3 py-1.5 text-xs inline-flex items-center gap-1.5"
            >
              <span
                className="h-3 w-3 rounded-full border border-white/30"
                style={{
                  backgroundColor: sw.value || customTheme.textPrimary,
                }}
              />
              <span>{sw.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Typography Studio: 13 Built-In Fonts + Custom Font File Upload */}
      <div className="royal-card rounded-2xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <Type className="h-5 w-5 gold-accent" />
            <h3 className="text-base font-bold">
              Fonts ({BUILTIN_FONTS.length + customFonts.length}) & Font Upload
            </h3>
          </div>

          <label className="royal-btn-outline inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs cursor-pointer">
            <Upload className="h-3.5 w-3.5 gold-accent" />
            <span>Upload Font (.ttf / .otf / .woff2)</span>
            <input
              type="file"
              accept=".ttf,.otf,.woff,.woff2"
              onChange={handleFontFileUpload}
              className="hidden"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {customFonts.map((uf) => {
            const active = fontId === uf.id;
            return (
              <div
                key={uf.id}
                onClick={() => setFontId(uf.id)}
                style={{
                  fontFamily: `'CustomFont_${uf.id}', sans-serif`,
                  borderColor: active
                    ? "var(--accent-secondary)"
                    : "var(--border-subtle)",
                }}
                className="royal-elevated rounded-xl p-3.5 cursor-pointer flex items-center justify-between gap-2"
              >
                <div>
                  <div className="text-sm font-bold">{uf.name}</div>
                  <div className="text-[11px] gold-accent">Uploaded Font</div>
                </div>
                <button
                  type="button"
                  onClick={(ev) => {
                    ev.stopPropagation();
                    setCustomFonts((prev) =>
                      prev.filter((item) => item.id !== uf.id)
                    );
                    if (fontId === uf.id) setFontId("plus_jakarta");
                  }}
                  className="text-rose-400 p-1"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}

          {BUILTIN_FONTS.map((f) => {
            const active = fontId === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFontId(f.id)}
                style={{
                  fontFamily: f.family,
                  borderColor: active
                    ? "var(--accent-secondary)"
                    : "var(--border-subtle)",
                }}
                className="royal-elevated rounded-xl p-3.5 text-start flex items-center justify-between gap-2"
              >
                <div>
                  <div className="text-sm font-bold">{f.name}</div>
                  <div className="text-[11px] text-muted-royal">
                    {f.category}
                  </div>
                </div>
                {active && <Check className="h-4 w-4 gold-accent shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Owner Password Reset */}
      <div className="royal-card rounded-2xl p-6 flex flex-wrap items-end justify-between gap-4">
        <div className="w-full sm:w-80">
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
            Change My Password
          </label>
          <input
            type="password"
            minLength={6}
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="royal-input w-full"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="royal-btn inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm"
        >
          <Save className="h-4 w-4" />
          <span>{saving ? "Saving..." : "Save All Settings"}</span>
        </button>
      </div>
    </form>
  );
}
