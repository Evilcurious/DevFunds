"use client";

import React from "react";
import { Check, Palette, RotateCcw, X } from "lucide-react";
import { ROYAL_THEMES, TEXT_COLOR_SWATCHES } from "@/lib/themes";
import { useApp } from "./app-context";

export function ThemeDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const {
    lang,
    t,
    activeThemeId,
    activePalette,
    activeTextColor,
    setVisitorAppearance,
    clearVisitorOverrides,
  } = useApp();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/55 backdrop-blur-xs">
      <div
        style={{
          backgroundColor: "var(--bg-surface)",
          borderColor: "var(--border-subtle)",
        }}
        className="h-full w-full max-w-sm border-s p-6 overflow-y-auto space-y-6 shadow-2xl"
      >
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5">
            <Palette className="h-5 w-5 gold-accent" />
            <h2 className="text-base font-bold">{t("themeSelector")}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 hover:opacity-80"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 7 Royal Preset Themes */}
        <div className="space-y-2.5">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-royal">
            7 Royal & Legacy Themes
          </div>
          <div className="grid grid-cols-1 gap-2">
            {ROYAL_THEMES.map((preset) => {
              const selected = activeThemeId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() =>
                    setVisitorAppearance({ themeId: preset.id })
                  }
                  style={{
                    backgroundColor: preset.palette.bgSurface,
                    borderColor: selected
                      ? preset.palette.accentSecondary
                      : preset.palette.borderSubtle,
                    color: preset.palette.textPrimary,
                  }}
                  className="flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <span
                        className="h-4 w-4 rounded-full border border-white/25"
                        style={{ backgroundColor: preset.palette.bgCanvas }}
                      />
                      <span
                        className="h-4 w-4 rounded-full border border-white/25"
                        style={{
                          backgroundColor: preset.palette.accentPrimary,
                        }}
                      />
                      <span
                        className="h-4 w-4 rounded-full border border-white/25"
                        style={{
                          backgroundColor: preset.palette.accentSecondary,
                        }}
                      />
                    </span>
                    <span>
                      {lang === "ur" ? preset.urduName : preset.name}
                    </span>
                  </div>
                  {selected && (
                    <Check
                      className="h-4 w-4"
                      style={{ color: preset.palette.accentSecondary }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Theme Color Picker */}
        <div className="space-y-3 pt-2 border-t border-[var(--border-subtle)]">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-royal">
            {t("customTheme")}
          </div>
          <div className="grid grid-cols-3 gap-2.5 text-xs">
            <label className="royal-elevated rounded-xl p-2.5 flex flex-col items-center gap-1.5">
              <span>Background</span>
              <input
                type="color"
                value={activePalette.bgCanvas}
                onChange={(e) =>
                  setVisitorAppearance({
                    themeId: "custom",
                    customTheme: {
                      ...activePalette,
                      bgCanvas: e.target.value,
                    },
                  })
                }
                className="h-8 w-full rounded cursor-pointer bg-transparent"
              />
            </label>
            <label className="royal-elevated rounded-xl p-2.5 flex flex-col items-center gap-1.5">
              <span>Cards</span>
              <input
                type="color"
                value={activePalette.bgSurface}
                onChange={(e) =>
                  setVisitorAppearance({
                    themeId: "custom",
                    customTheme: {
                      ...activePalette,
                      bgSurface: e.target.value,
                      bgElevated: e.target.value,
                    },
                  })
                }
                className="h-8 w-full rounded cursor-pointer bg-transparent"
              />
            </label>
            <label className="royal-elevated rounded-xl p-2.5 flex flex-col items-center gap-1.5">
              <span>Accent</span>
              <input
                type="color"
                value={activePalette.accentPrimary}
                onChange={(e) =>
                  setVisitorAppearance({
                    themeId: "custom",
                    customTheme: {
                      ...activePalette,
                      accentPrimary: e.target.value,
                    },
                  })
                }
                className="h-8 w-full rounded cursor-pointer bg-transparent"
              />
            </label>
          </div>
        </div>

        {/* Custom Text Color Selector */}
        <div className="space-y-3 pt-2 border-t border-[var(--border-subtle)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-royal">
              {t("textColor")}
            </span>
            <input
              type="color"
              value={activeTextColor || activePalette.textPrimary}
              onChange={(e) =>
                setVisitorAppearance({ textColorOverride: e.target.value })
              }
              className="h-7 w-12 rounded cursor-pointer bg-transparent"
            />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {TEXT_COLOR_SWATCHES.map((sw) => (
              <button
                key={sw.label}
                type="button"
                onClick={() =>
                  setVisitorAppearance({ textColorOverride: sw.value })
                }
                className="royal-elevated rounded-lg px-2 py-2 text-[11px] font-medium flex flex-col items-center gap-1"
              >
                <span
                  className="h-4 w-4 rounded-full border border-white/30"
                  style={{
                    backgroundColor: sw.value || activePalette.textPrimary,
                  }}
                />
                <span className="truncate w-full text-center">{sw.label}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            clearVisitorOverrides();
            onClose();
          }}
          className="royal-btn-outline w-full rounded-xl py-2.5 text-xs flex items-center justify-center gap-2"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reset to Workspace Default</span>
        </button>
      </div>
    </div>
  );
}
