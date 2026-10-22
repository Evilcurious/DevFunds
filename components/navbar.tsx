"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarCheck2,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  ShieldCheck,
  Sun,
  Users,
  X,
} from "lucide-react";
import { PORTAL_META } from "@/lib/constants";
import { useApp } from "./app-context";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/spending", label: "Spending", icon: ArrowDownRight },
  { href: "/earning", label: "Earning", icon: ArrowUpRight },
  { href: "/staff", label: "Staff", icon: Users },
  { href: "/attendance", label: "Attendance", icon: CalendarCheck2 },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, settings, theme, toggleTheme, logout } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-blue-100/90 dark:border-slate-800/90 bg-white/95 dark:bg-[#0D162B]/95 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-sm shadow-blue-600/25 group-hover:scale-[1.03] transition-transform">
              <span className="text-lg font-extrabold tracking-tight">DF</span>
            </div>
            <div className="leading-tight">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                  {settings.companyName}
                </span>
                <span className="hidden sm:inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-500/30">
                  ERP
                </span>
              </div>
              <p className="hidden md:block text-xs text-slate-500 dark:text-slate-400 truncate max-w-[230px]">
                Finance, Customers, Staff & Attendance
              </p>
            </div>
          </Link>

          {/* Primary Center Navigation */}
          <nav className="hidden lg:flex items-center gap-1 rounded-xl bg-slate-100/90 dark:bg-slate-900/90 p-1 border border-slate-200/70 dark:border-slate-800">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition-all ${
                    active
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20"
                      : "text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-white/70 dark:hover:bg-slate-800/70"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Actions: Theme Switcher + Portals Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle dark and white mode"
              title={
                theme === "light"
                  ? "Switch to Dark Mode"
                  : "Switch to White & Blue Mode"
              }
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 text-slate-700 dark:text-blue-300 hover:border-blue-400 hover:bg-blue-50/70 dark:hover:bg-slate-800 transition-colors"
            >
              {theme === "light" ? (
                <Moon className="h-4 w-4 text-blue-700" />
              ) : (
                <Sun className="h-4 w-4 text-amber-400" />
              )}
            </button>

            <Link
              href="/portals"
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all border ${
                isActive("/portals")
                  ? "bg-blue-700 text-white border-blue-700 shadow-sm"
                  : user
                  ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-sm shadow-blue-600/20"
                  : "bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:hover:bg-blue-500/25 dark:text-blue-300 dark:border-blue-500/30"
              }`}
            >
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">
                {user
                  ? PORTAL_META[user.portalRole].shortTitle + " Portal"
                  : "Portals (4)"}
              </span>
              <span className="sm:hidden">
                {user ? PORTAL_META[user.portalRole].shortTitle : "Portals"}
              </span>
            </Link>

            {user && (
              <button
                type="button"
                onClick={logout}
                title="Sign out of portal"
                className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-rose-600 hover:border-rose-300 transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label="Open navigation menu"
              className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
            >
              {mobileOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D162B] px-4 py-3 space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold ${
                  active
                    ? "bg-blue-600 text-white"
                    : "text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-800"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
            <Link
              href="/portals"
              onClick={() => setMobileOpen(false)}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>
                {user
                  ? `Open ${PORTAL_META[user.portalRole].title}`
                  : "Open Portals (IT CEO / BD CEO / Owner / Staff)"}
              </span>
            </Link>
            {user && (
              <button
                type="button"
                onClick={() => {
                  logout();
                  setMobileOpen(false);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-sm font-medium text-rose-600 dark:text-rose-400"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
