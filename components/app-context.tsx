"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import type { AppSettings, UserRecord } from "@/lib/types";

interface ToastItem {
  id: string;
  message: string;
  tone: "success" | "error" | "info";
}

interface AppContextValue {
  user: UserRecord | null;
  settings: AppSettings;
  dbMode: "neon" | "postgres" | "local";
  loadingAuth: boolean;
  theme: "light" | "dark";
  toggleTheme: () => void;
  setTheme: (next: "light" | "dark") => void;
  refreshSession: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<UserRecord | null>>;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  logout: () => Promise<void>;
  toast: (message: string, tone?: "success" | "error" | "info") => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserRecord | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [dbMode, setDbMode] = useState<"neon" | "postgres" | "local">("local");
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [theme, setThemeState] = useState<"light" | "dark">("light");
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const applyDomTheme = useCallback((mode: "light" | "dark") => {
    const root = document.documentElement;
    if (mode === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    try {
      localStorage.setItem("devfunds_theme", mode);
    } catch {
      // ignore storage restriction
    }
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("devfunds_theme");
      if (saved === "dark" || saved === "light") {
        setThemeState(saved);
        applyDomTheme(saved);
      } else {
        applyDomTheme("light");
      }
    } catch {
      applyDomTheme("light");
    }
  }, [applyDomTheme]);

  const setTheme = useCallback(
    (next: "light" | "dark") => {
      setThemeState(next);
      applyDomTheme(next);
    },
    [applyDomTheme]
  );

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === "light" ? "dark" : "light";
      applyDomTheme(next);
      return next;
    });
  }, [applyDomTheme]);

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user ?? null);
        if (data.settings) setSettings(data.settings);
        if (data.dbMode) setDbMode(data.dbMode);
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

  const toast = useCallback(
    (message: string, tone: "success" | "error" | "info" = "success") => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev.slice(-3), { id, message, tone }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3800);
    },
    []
  );

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    setUser(null);
    toast("Signed out successfully.", "info");
  }, [toast]);

  return (
    <AppContext.Provider
      value={{
        user,
        settings,
        dbMode,
        loadingAuth,
        theme,
        toggleTheme,
        setTheme,
        refreshSession,
        setUser,
        setSettings,
        logout,
        toast,
      }}
    >
      {children}

      {/* Floating Crisp Toast Stack */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-[calc(100vw-2.5rem)] pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-xl border px-4 py-3 text-sm font-medium shadow-lg backdrop-blur transition-all flex items-center justify-between gap-3 ${
              t.tone === "error"
                ? "bg-white dark:bg-slate-900 border-rose-200 dark:border-rose-500/40 text-rose-700 dark:text-rose-300"
                : t.tone === "info"
                ? "bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-500/40 text-slate-800 dark:text-slate-100"
                : "bg-blue-600 text-white border-blue-500 shadow-blue-600/20"
            }`}
          >
            <span>{t.message}</span>
            <button
              onClick={() =>
                setToasts((prev) => prev.filter((item) => item.id !== t.id))
              }
              className="opacity-75 hover:opacity-100 text-xs font-bold px-1"
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
