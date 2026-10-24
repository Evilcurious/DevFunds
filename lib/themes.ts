import type { CustomThemePalette, ThemePresetId } from "./types";

export interface RoyalThemePreset {
  id: Exclude<ThemePresetId, "custom">;
  name: string;
  urduName: string;
  palette: CustomThemePalette;
}

export const ROYAL_THEMES: RoyalThemePreset[] = [
  {
    id: "imperial_sapphire",
    name: "Imperial Sapphire",
    urduName: "شاہی نیلم",
    palette: {
      bgCanvas: "#070E1C",
      bgSurface: "#0E192E",
      bgElevated: "#152340",
      borderSubtle: "#21355C",
      accentPrimary: "#2563EB",
      accentSecondary: "#D4AF37",
      textPrimary: "#F8FAFC",
      textMuted: "#94A3B8",
    },
  },
  {
    id: "ivory_sovereign",
    name: "Ivory Sovereign",
    urduName: "شاہی سفید و نیلا",
    palette: {
      bgCanvas: "#F5F7FB",
      bgSurface: "#FFFFFF",
      bgElevated: "#EEF3FA",
      borderSubtle: "#DCE4F0",
      accentPrimary: "#1D4ED8",
      accentSecondary: "#B8860B",
      textPrimary: "#0B1324",
      textMuted: "#52627C",
    },
  },
  {
    id: "obsidian_gold",
    name: "Obsidian Crown",
    urduName: "شاہی طلائی سیاہ",
    palette: {
      bgCanvas: "#090B10",
      bgSurface: "#121620",
      bgElevated: "#1A202E",
      borderSubtle: "#2B3347",
      accentPrimary: "#C9A227",
      accentSecondary: "#E5C158",
      textPrimary: "#F9FAFB",
      textMuted: "#9CA3AF",
    },
  },
  {
    id: "emerald_dynasty",
    name: "Emerald Dynasty",
    urduName: "زمرد سلطنت",
    palette: {
      bgCanvas: "#061511",
      bgSurface: "#0D231D",
      bgElevated: "#14332A",
      borderSubtle: "#1F4B3E",
      accentPrimary: "#10B981",
      accentSecondary: "#D4AF37",
      textPrimary: "#F0FDF4",
      textMuted: "#94B8A8",
    },
  },
  {
    id: "burgundy_crown",
    name: "Burgundy Heritage",
    urduName: "شاہی یاقوت",
    palette: {
      bgCanvas: "#14080E",
      bgSurface: "#210F18",
      bgElevated: "#2F1623",
      borderSubtle: "#4A2438",
      accentPrimary: "#E11D48",
      accentSecondary: "#F59E0B",
      textPrimary: "#FFF1F2",
      textMuted: "#C4A1AE",
    },
  },
  {
    id: "pearl_platinum",
    name: "Pearl Heritage",
    urduName: "موتی شاہی",
    palette: {
      bgCanvas: "#F8F6F1",
      bgSurface: "#FFFFFF",
      bgElevated: "#F0ECE1",
      borderSubtle: "#DFD8C8",
      accentPrimary: "#1E3A8A",
      accentSecondary: "#A16207",
      textPrimary: "#111827",
      textMuted: "#57534E",
    },
  },
  {
    id: "amethyst_regency",
    name: "Amethyst Regency",
    urduName: "شاہی بنفشی",
    palette: {
      bgCanvas: "#0E091E",
      bgSurface: "#171130",
      bgElevated: "#221945",
      borderSubtle: "#352869",
      accentPrimary: "#7C3AED",
      accentSecondary: "#EAB308",
      textPrimary: "#F5F3FF",
      textMuted: "#A59EC4",
    },
  },
];

export interface FontPreset {
  id: string;
  name: string;
  family: string;
  category: string;
}

export const BUILTIN_FONTS: FontPreset[] = [
  {
    id: "plus_jakarta",
    name: "Plus Jakarta Executive",
    family: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    category: "Executive Sans",
  },
  {
    id: "cinzel_royal",
    name: "Cinzel & Jakarta Royal",
    family: "'Cinzel', 'Playfair Display', Georgia, serif",
    category: "Royal Crest",
  },
  {
    id: "playfair_legacy",
    name: "Playfair Legacy Serif",
    family: "'Playfair Display', Georgia, Cambria, serif",
    category: "Legacy Banking",
  },
  {
    id: "cormorant_sovereign",
    name: "Cormorant Sovereign",
    family: "'Cormorant Garamond', Georgia, serif",
    category: "Sovereign Heritage",
  },
  {
    id: "inter_swiss",
    name: "Inter Swiss Precision",
    family: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    category: "Modern Swiss",
  },
  {
    id: "libre_baskerville",
    name: "Libre Baskerville",
    family: "'Libre Baskerville', Georgia, serif",
    category: "Classic Institution",
  },
  {
    id: "lora_editorial",
    name: "Lora Executive",
    family: "'Lora', Georgia, serif",
    category: "Refined Serif",
  },
  {
    id: "merriweather_ledger",
    name: "Merriweather Ledger",
    family: "'Merriweather', Georgia, serif",
    category: "Formal Ledger",
  },
  {
    id: "outfit_geometric",
    name: "Outfit Architectural",
    family: "'Outfit', sans-serif",
    category: "Clean Geometric",
  },
  {
    id: "space_grotesk",
    name: "Space Grotesk Modern",
    family: "'Space Grotesk', sans-serif",
    category: "Contemporary",
  },
  {
    id: "poppins_corporate",
    name: "Poppins Corporate",
    family: "'Poppins', sans-serif",
    category: "Corporate",
  },
  {
    id: "dm_sans",
    name: "DM Sans Minimal",
    family: "'DM Sans', sans-serif",
    category: "Minimalist",
  },
  {
    id: "noto_urdu",
    name: "Noto Nastaliq & Naskh",
    family: "'Noto Nastaliq Urdu', 'Amiri', 'Plus Jakarta Sans', serif",
    category: "Urdu Calligraphic",
  },
];

export const TEXT_COLOR_SWATCHES = [
  { label: "Auto Theme", value: "" },
  { label: "Pure Ivory", value: "#FFFFFF" },
  { label: "Champagne", value: "#FEF3C7" },
  { label: "Sky Ice", value: "#E0F2FE" },
  { label: "Royal Ink", value: "#0B1324" },
  { label: "Deep Navy", value: "#1E3A8A" },
  { label: " Royal Gold", value: "#D4AF37" },
  { label: "Charcoal", value: "#1F2937" },
];

export function resolveActivePalette(
  themeId: ThemePresetId,
  customTheme: CustomThemePalette
): CustomThemePalette {
  if (themeId === "custom") {
    return customTheme;
  }
  const found = ROYAL_THEMES.find((t) => t.id === themeId);
  return found ? found.palette : ROYAL_THEMES[0].palette;
}
