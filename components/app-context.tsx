"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { CURRENCIES, DEFAULT_SETTINGS } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import { tr, type TranslationKey } from "@/lib/i18n";
import { BUILTIN_FONTS, resolveActivePalette } from "@/lib/themes";
import type {
  AppSettings,
  CurrencyCode,
  LanguageCode,
  NotificationRecord,
  UserRecord,
} from "@/lib/types";

interface ToastItem {
  id: string;
  message: string;
  tone: "success" | "error" | "info";
}

interface AppContextValue {
  user: UserRecord | null;
  settings: AppSettings;
  lang: LanguageCode;
  t: (key: TranslationKey) => string;
  setVisitorLanguage: (lang: LanguageCode) => void;
  displayCurrency: CurrencyCode;
  setDisplayCurrency: (code: CurrencyCode) => void;
  money: (amount: number) => string;
  loadingAuth: boolean;
  refreshSession: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<UserRecord | null>>;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  logout: () => Promise<void>;
  toast: (message: string, tone?: "success" | "error" | "info") => void;
  notifications: NotificationRecord[];
  unreadCount: number;
  refreshNotifications: () => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  requestBrowserNotifications: () => Promise<boolean>;
  browserNotifPermission: NotificationPermission | "unsupported";
}

const AppContext = createContext<AppContextValue | null>(null);

const LANG_KEY = "devzard_lang_v3";
const CURRENCY_KEY = "devzard_currency_v3";

function playSubtleChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1174, ctx.currentTime + 0.14);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.36);
  } catch {
    // ignore autoplay restriction
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserRecord | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [langOverride, setLangOverride] = useState<LanguageCode | null>(null);
  const [currencyOverride, setCurrencyOverride] =
    useState<CurrencyCode | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [browserNotifPermission, setBrowserNotifPermission] = useState<
    NotificationPermission | "unsupported"
  >("default");

  const announcedIdsRef = useRef<Set<string>>(new Set());

  const toast = useCallback(
    (message: string, tone: "success" | "error" | "info" = "success") => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev.slice(-3), { id, message, tone }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, 4200);
    },
    []
  );

  useEffect(() => {
    try {
      // Remove any legacy public theme override key so ONLY ERP Owner controls theme
      localStorage.removeItem("devfunds_visitor_appearance_v2");
      const savedLang = localStorage.getItem(LANG_KEY);
      if (savedLang === "en" || savedLang === "ur") {
        setLangOverride(savedLang);
      }
      const savedCurr = localStorage.getItem(CURRENCY_KEY) as CurrencyCode;
      if (savedCurr && CURRENCIES[savedCurr]) {
        setCurrencyOverride(savedCurr);
      }
    } catch {
      // ignore storage restrictions
    }
    if (typeof window !== "undefined" && "Notification" in window) {
      setBrowserNotifPermission(Notification.permission);
    } else {
      setBrowserNotifPermission("unsupported");
    }
  }, []);

  const setVisitorLanguage = useCallback((nextLang: LanguageCode) => {
    setLangOverride(nextLang);
    try {
      localStorage.setItem(LANG_KEY, nextLang);
    } catch {
      // ignore
    }
  }, []);

  const setDisplayCurrency = useCallback((code: CurrencyCode) => {
    setCurrencyOverride(code);
    try {
      localStorage.setItem(CURRENCY_KEY, code);
    } catch {
      // ignore
    }
  }, []);

  const lang: LanguageCode = langOverride ?? settings.language;
  const displayCurrency: CurrencyCode = currencyOverride ?? settings.currency;

  const money = useCallback(
    (amount: number) =>
      formatMoney(amount, displayCurrency, settings.currency),
    [displayCurrency, settings.currency]
  );

  // Theme, colors & font come strictly from ERP Owner's global settings!
  const activePalette = resolveActivePalette(
    settings.themeId,
    settings.customTheme
  );

  useEffect(() => {
    if (typeof document === "undefined") return;
    for (const font of settings.customFonts || []) {
      const safeFamily = `CustomFont_${font.id}`;
      try {
        const face = new FontFace(safeFamily, `url(${font.dataUrl})`);
        face
          .load()
          .then((loaded) => {
            document.fonts.add(loaded);
          })
          .catch(() => undefined);
      } catch {
        // ignore invalid font binary
      }
    }
  }, [settings.customFonts]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.style.setProperty("--bg-canvas", activePalette.bgCanvas);
    root.style.setProperty("--bg-surface", activePalette.bgSurface);
    root.style.setProperty("--bg-elevated", activePalette.bgElevated);
    root.style.setProperty("--border-subtle", activePalette.borderSubtle);
    root.style.setProperty("--accent-primary", activePalette.accentPrimary);
    root.style.setProperty("--accent-secondary", activePalette.accentSecondary);
    root.style.setProperty(
      "--text-primary",
      settings.textColorOverride || activePalette.textPrimary
    );
    root.style.setProperty("--text-muted", activePalette.textMuted);

    const uploadedMatch = settings.customFonts?.find(
      (f) => f.id === settings.fontId
    );
    const builtinMatch = BUILTIN_FONTS.find((f) => f.id === settings.fontId);
    const baseFamily = uploadedMatch
      ? `'CustomFont_${uploadedMatch.id}', 'Plus Jakarta Sans', sans-serif`
      : builtinMatch
      ? builtinMatch.family
      : BUILTIN_FONTS[0].family;

    root.style.setProperty(
      "--app-font",
      lang === "ur"
        ? `'Noto Nastaliq Urdu', 'Amiri', ${baseFamily}`
        : baseFamily
    );

    root.dir = lang === "ur" ? "rtl" : "ltr";
    root.lang = lang;
    document.title = settings.companyName || "DEVZARD";
  }, [activePalette, settings, lang]);

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user ?? null);
        if (data.settings) setSettings(data.settings);
      }
    } catch {
      // keep existing state
    } finally {
      setLoadingAuth(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const requestBrowserNotifications = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return false;
    }
    if (Notification.permission === "granted") {
      setBrowserNotifPermission("granted");
      return true;
    }
    try {
      const result = await Notification.requestPermission();
      setBrowserNotifPermission(result);
      return result === "granted";
    } catch {
      return false;
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const list: NotificationRecord[] = data.notifications ?? [];
      setNotifications(list);
      setUnreadCount(data.unreadCount ?? 0);

      for (const item of list) {
        if (!item.isRead && !announcedIdsRef.current.has(item.id)) {
          announcedIdsRef.current.add(item.id);
          playSubtleChime();
          toast(`${item.title} — ${item.body}`, "info");
          if (
            typeof window !== "undefined" &&
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            try {
              new Notification(item.title, {
                body: item.body,
                icon: "/devzard-logo.png",
              });
            } catch {
              // ignore fallback
            }
          }
        }
      }
    } catch {
      // ignore transient network error
    }
  }, [user, toast]);

  useEffect(() => {
    if (!user) {
      announcedIdsRef.current.clear();
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    refreshNotifications();
    const timer = setInterval(refreshNotifications, 8000);
    return () => clearInterval(timer);
  }, [user, refreshNotifications]);

  const markAllNotificationsRead = useCallback(async () => {
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    }).catch(() => undefined);
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    setUser(null);
    setNotifications([]);
    setUnreadCount(0);
    if (typeof window !== "undefined") {
      window.location.href = "/portals";
    }
  }, []);

  const t = useCallback((key: TranslationKey) => tr(lang, key), [lang]);

  return (
    <AppContext.Provider
      value={{
        user,
        settings,
        lang,
        t,
        setVisitorLanguage,
        displayCurrency,
        setDisplayCurrency,
        money,
        loadingAuth,
        refreshSession,
        setUser,
        setSettings,
        logout,
        toast,
        notifications,
        unreadCount,
        refreshNotifications,
        markAllNotificationsRead,
        requestBrowserNotifications,
        browserNotifPermission,
      }}
    >
      {children}

      {/* Minimal Royal Toast Stack */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-[calc(100vw-2.5rem)] pointer-events-none">
        {toasts.map((item) => (
          <div
            key={item.id}
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor:
                item.tone === "error"
                  ? "#ef4444"
                  : "var(--accent-secondary)",
              color: "var(--text-primary)",
            }}
            className="pointer-events-auto rounded-xl border px-4 py-3 text-sm font-medium shadow-2xl flex items-center justify-between gap-3"
          >
            <span>{item.message}</span>
            <button
              type="button"
              onClick={() =>
                setToasts((prev) => prev.filter((x) => x.id !== item.id))
              }
              className="opacity-60 hover:opacity-100 text-xs px-1"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useApp must be used inside AppProvider");
  }
  return ctx;
}
