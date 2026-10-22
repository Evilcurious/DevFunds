"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  Crown,
  KeyRound,
  Laptop,
  LogIn,
  LogOut,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import { useApp } from "@/components/app-context";
import { AdminPortalView } from "@/components/portals/admin-portal-view";
import { StaffPortalView } from "@/components/portals/staff-portal-view";
import { INITIAL_PORTAL_ACCOUNTS, PORTAL_META } from "@/lib/constants";
import type { PortalRole } from "@/lib/types";

const PORTAL_ORDER: PortalRole[] = [
  "it_ceo",
  "bd_ceo",
  "erp_owner",
  "staff",
];

function PortalIcon({ role }: { role: PortalRole }) {
  switch (role) {
    case "erp_owner":
      return <Crown className="h-6 w-6" />;
    case "it_ceo":
      return <Laptop className="h-6 w-6" />;
    case "bd_ceo":
      return <TrendingUp className="h-6 w-6" />;
    default:
      return <UserCheck className="h-6 w-6" />;
  }
}

export default function PortalsHubPage() {
  const { user, setUser, settings, loadingAuth, logout, toast } = useApp();
  const [selectedPortal, setSelectedPortal] = useState<PortalRole>("erp_owner");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [suggestedRole, setSuggestedRole] = useState<PortalRole | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuggestedRole(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          expectedRole: selectedPortal,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Sign in failed.");
        if (data.actualRole) {
          setSuggestedRole(data.actualRole as PortalRole);
        }
        setSubmitting(false);
        return;
      }
      setUser(data.user);
      toast(`Signed in to ${PORTAL_META[data.user.portalRole as PortalRole].title}!`);
    } catch {
      setError("Network error while signing in.");
    } finally {
      setSubmitting(false);
    }
  };

  const quickFill = (role: PortalRole) => {
    setSelectedPortal(role);
    setError("");
    const found = INITIAL_PORTAL_ACCOUNTS.find((a) => a.portalRole === role);
    if (found) {
      setEmail(found.email);
      setPassword(found.defaultPassword);
    }
  };

  if (loadingAuth) {
    return (
      <div className="p-16 text-center text-sm text-slate-500">
        Checking portal session...
      </div>
    );
  }

  // Authenticated View -> Show active role portal + Switch Portal bar
  if (user) {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200/80 dark:border-slate-800 bg-white dark:bg-[#111C35] px-5 py-3 shadow-xs">
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="text-slate-600 dark:text-slate-300">
              Active Session:
            </span>
            <strong className="font-bold text-slate-900 dark:text-white">
              {PORTAL_META[user.portalRole].title}
            </strong>
            <span className="text-slate-400">({user.email})</span>
          </div>

          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-rose-300 hover:text-rose-600 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Switch Portal / Sign Out</span>
          </button>
        </div>

        {user.portalRole === "staff" ? (
          <StaffPortalView />
        ) : (
          <AdminPortalView />
        )}
      </div>
    );
  }

  // Signed-Out View -> Choose 1 of the 4 Portals + Sign In
  const activeMeta = PORTAL_META[selectedPortal];

  return (
    <div className="space-y-8">
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-500/30 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
          4 Dedicated Role Portals
        </span>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Select Your Workspace Portal
        </h1>
        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400">
          Choose between{" "}
          <strong className="text-slate-700 dark:text-slate-200">IT CEO</strong>
          ,{" "}
          <strong className="text-slate-700 dark:text-slate-200">BD CEO</strong>
          ,{" "}
          <strong className="text-slate-700 dark:text-slate-200">
            ERP Owner
          </strong>
          , and{" "}
          <strong className="text-slate-700 dark:text-slate-200">Staff</strong>{" "}
          portals below to sign in.
        </p>
      </div>

      {/* 4 Portal Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PORTAL_ORDER.map((role) => {
          const meta = PORTAL_META[role];
          const selected = selectedPortal === role;

          return (
            <button
              key={role}
              type="button"
              onClick={() => {
                setSelectedPortal(role);
                setError("");
                setSuggestedRole(null);
              }}
              className={`text-left rounded-2xl border p-5 transition-all flex flex-col justify-between gap-4 ${
                selected
                  ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20 ring-2 ring-blue-600/40"
                  : "bg-white dark:bg-[#111C35] border-slate-200 dark:border-slate-800 hover:border-blue-400"
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                      selected
                        ? "bg-white/20 text-white"
                        : "bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-300"
                    }`}
                  >
                    <PortalIcon role={role} />
                  </div>
                  {selected && (
                    <span className="rounded-full bg-white text-blue-700 px-2.5 py-0.5 text-[11px] font-extrabold">
                      Selected
                    </span>
                  )}
                </div>

                <h2 className="mt-4 text-lg font-extrabold">{meta.title}</h2>
                <p
                  className={`mt-1 text-xs leading-relaxed ${
                    selected
                      ? "text-blue-100"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {meta.subtitle}
                </p>
              </div>

              <ul className="space-y-1.5 pt-3 border-t border-current/10 text-xs">
                {meta.capabilities.map((cap, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <CheckCircle2
                      className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${
                        selected
                          ? "text-blue-200"
                          : "text-blue-600 dark:text-blue-400"
                      }`}
                    />
                    <span
                      className={
                        selected
                          ? "text-white/95"
                          : "text-slate-600 dark:text-slate-300"
                      }
                    >
                      {cap}
                    </span>
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      {/* Sign-In Card + Optional Initial Setup Credentials Helper */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start max-w-5xl mx-auto">
        <form
          onSubmit={handleLogin}
          className="lg:col-span-7 rounded-3xl border border-blue-200 dark:border-slate-800 bg-white dark:bg-[#111C35] p-6 sm:p-8 shadow-sm space-y-5"
        >
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Portal Authentication
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
              Sign in to {activeMeta.title}
            </h2>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-500/15 dark:border-rose-500/30 p-3.5 text-xs sm:text-sm font-medium text-rose-700 dark:text-rose-300 space-y-2">
              <p>{error}</p>
              {suggestedRole && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPortal(suggestedRole);
                    setError("");
                    setSuggestedRole(null);
                  }}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white"
                >
                  Switch to {PORTAL_META[suggestedRole].title}
                </button>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Portal Email *
            </label>
            <input
              type="email"
              required
              placeholder={
                selectedPortal === "staff"
                  ? "staff.member@devzard.app"
                  : INITIAL_PORTAL_ACCOUNTS.find(
                      (a) => a.portalRole === selectedPortal
                    )?.email || "email@devzard.app"
              }
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Password *
            </label>
            <input
              type="password"
              required
              placeholder="Enter portal password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 py-3 px-5 text-sm font-bold text-white shadow-md shadow-blue-600/20 transition-colors"
          >
            <LogIn className="h-4 w-4" />
            <span>
              {submitting
                ? "Signing In..."
                : `Enter ${activeMeta.title}`}
            </span>
          </button>
        </form>

        {/* Initial Setup Login Card */}
        <div className="lg:col-span-5 rounded-3xl border border-blue-100 dark:border-slate-800 bg-[#F4F8FF] dark:bg-[#111C35] p-6 space-y-4">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
            <KeyRound className="h-5 w-5" />
            <h3 className="text-sm font-extrabold uppercase tracking-wider">
              Portal Access Info
            </h3>
          </div>

          {settings.showSetupHint ? (
            <>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Click any initial executive portal account below to auto-fill,
                then change default passwords inside{" "}
                <strong>ERP Owner → Settings</strong> anytime:
              </p>

              <div className="space-y-2.5">
                {INITIAL_PORTAL_ACCOUNTS.map((acct) => (
                  <button
                    key={acct.email}
                    type="button"
                    onClick={() => quickFill(acct.portalRole)}
                    className="w-full text-left rounded-xl border border-blue-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 hover:border-blue-500 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-blue-700 dark:text-blue-300">
                        {PORTAL_META[acct.portalRole].title}
                      </span>
                      <span className="text-[11px] font-semibold text-blue-600">
                        Click to fill →
                      </span>
                    </div>
                    <div className="mt-1 font-mono text-xs text-slate-700 dark:text-slate-200">
                      {acct.email} · {acct.defaultPassword}
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Sign in with the credentials assigned by your ERP Owner or
              Department CEO.
            </p>
          )}

          <div className="rounded-xl border border-blue-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 p-3.5 text-xs text-slate-600 dark:text-slate-300">
            <strong className="text-slate-900 dark:text-white">
              Staff Portal Accounts:
            </strong>{" "}
            Staff accounts are created by the <strong>IT CEO</strong> (for IT
            staff), <strong>BD CEO</strong> (for BD staff), or{" "}
            <strong>ERP Owner</strong>. Once created, staff log in here to
            update their live status, skills, bio, free time, and attendance.
          </div>
        </div>
      </div>
    </div>
  );
}
