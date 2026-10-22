"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Crown,
  Languages,
  LogOut,
  Menu,
  Palette,
  X,
} from "lucide-react";
import { PORTAL_META } from "@/lib/constants";
import { useApp } from "./app-context";
import { NotificationBell } from "./notification-bell";
import { ThemeDrawer } from "./theme-drawer";

export function Navbar() {
  const pathname = usePathname();
  const { user, settings, lang, t, setVisitorLanguage, logout } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);

  const navItems = [
    { href: "/", label: t("dashboard") },
    { href: "/spending", label: t("spending") },
    { href: "/earning", label: t("earning") },
    { href: "/staff", label: t("staff") },
    { href: "/attendance", label: t("attendance") },
    { href: "/todo", label: t("todo") },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <>
      <header
        style={{
          backgroundColor: "var(--bg-surface)",
          borderColor: "var(--border-subtle)",
        }}
        className="sticky top-0 z-40 border-b backdrop-blur-md"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Clean Royal Brand Crest + Website Name */}
            <Link href="/" className="flex items-center gap-3 shrink-0 group">
              {settings.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt={settings.companyName}
                  className="h-9 w-9 rounded-lg object-contain border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-0.5"
                />
              ) : (
                <div
                  style={{
                    borderColor: "var(--accent-secondary)",
                    backgroundColor: "var(--bg-elevated)",
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border"
                >
                  <Crown className="h-4 w-4 gold-accent" />
                </div>
              )}
              <span className="text-base font-bold tracking-wide">
                {settings.companyName}
              </span>
            </Link>

            {/* Clean Architectural Center Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={
                      active
                        ? {
                            backgroundColor: "var(--accent-primary)",
                            color: "#ffffff",
                          }
                        : undefined
                    }
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                      active
                        ? "shadow-xs"
                        : "text-muted-royal hover:opacity-100"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Right Controls: Language Switcher + Theme/Color Studio + Notifications + Portals */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setVisitorLanguage(lang === "en" ? "ur" : "en")}
                title="Switch English / اردو"
                className="royal-btn-outline inline-flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold"
              >
                <Languages className="h-3.5 w-3.5 gold-accent" />
                <span>{lang === "en" ? "اردو" : "EN"}</span>
              </button>

              <button
                type="button"
                onClick={() => setThemeOpen(true)}
                title={t("themeSelector")}
                className="royal-btn-outline inline-flex h-9 w-9 items-center justify-center rounded-xl"
              >
                <Palette className="h-4 w-4 gold-accent" />
              </button>

              <NotificationBell />

              <Link
                href="/portals"
                className="royal-btn inline-flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-xs sm:text-sm"
              >
                <span>
                  {user
                    ? lang === "ur"
                      ? PORTAL_META[user.portalRole].urduTitle
                      : PORTAL_META[user.portalRole].title
                    : t("portals")}
                </span>
              </Link>

              {user && (
                <button
                  type="button"
                  onClick={logout}
                  title={t("logout")}
                  className="royal-btn-outline hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-xl"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() => setMobileOpen((o) => !o)}
                className="royal-btn-outline lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-xl"
              >
                {mobileOpen ? (
                  <X className="h-4 w-4" />
                ) : (
                  <Menu className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {mobileOpen && (
          <div className="lg:hidden border-t border-[var(--border-subtle)] px-4 py-3 space-y-1">
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  style={
                    active
                      ? {
                          backgroundColor: "var(--accent-primary)",
                          color: "#ffffff",
                        }
                      : undefined
                  }
                  className="block rounded-lg px-3.5 py-2 text-sm font-medium"
                >
                  {item.label}
                </Link>
              );
            })}
            {user && (
              <button
                type="button"
                onClick={() => {
                  logout();
                  setMobileOpen(false);
                }}
                className="w-full text-start rounded-lg px-3.5 py-2 text-sm font-medium text-rose-400"
              >
                {t("logout")}
              </button>
            )}
          </div>
        )}
      </header>

      <ThemeDrawer open={themeOpen} onClose={() => setThemeOpen(false)} />
    </>
  );
}
