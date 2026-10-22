"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Crown,
  Laptop,
  LogIn,
  LogOut,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import { useApp } from "@/components/app-context";
import { AdminPortalView } from "@/components/portals/admin-portal-view";
import { StaffPortalView } from "@/components/portals/staff-portal-view";
import { PORTAL_META, STAFF_STATUS_META } from "@/lib/constants";
import type { PortalRole } from "@/lib/types";

const PORTAL_ORDER: PortalRole[] = [
  "erp_owner",
  "it_ceo",
  "bd_ceo",
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
  const router = useRouter();
  const {
    user,
    setUser,
    settings,
    lang,
    t,
    loadingAuth,
    logout,
    requestBrowserNotifications,
    toast,
  } = useApp();
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
      requestBrowserNotifications().catch(() => undefined);
      toast(`${data.user.name}`);
      router.push("/");
    } catch {
      setError("Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingAuth) {
    return (
      <div className="p-16 text-center text-xs text-muted-royal">...</div>
    );
  }

  // Signed-in workspace
  if (user) {
    const stMeta = STAFF_STATUS_META[user.staffStatus];
    return (
      <div className="space-y-6">
        <div className="royal-card flex flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-3.5">
          <div className="flex items-center gap-2.5 text-sm font-bold">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: stMeta.dotColor }}
            />
            <span>
              {lang === "ur"
                ? PORTAL_META[user.portalRole].urduTitle
                : PORTAL_META[user.portalRole].title}
            </span>
            <span className="text-muted-royal font-normal">
              · {user.name} ({lang === "ur" ? stMeta.urduLabel : stMeta.label})
            </span>
          </div>

          <button
            type="button"
            onClick={logout}
            className="royal-btn-outline inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>{t("switchPortal")}</span>
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

  const activeMeta = PORTAL_META[selectedPortal];

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-8">
      <div className="flex flex-col items-center text-center space-y-3">
        <img
          src={
            settings.logoUrl && settings.logoUrl !== "/devzard-logo.png"
              ? settings.logoUrl
              : "/devzard-logo-full.png"
          }
          alt={settings.companyName}
          className="h-20 w-auto rounded-2xl bg-white p-2.5 object-contain shadow-md"
        />
        <div className="gold-line w-28" />
      </div>

      {/* 4 Clean Royal Portal Cards — Only Crest + Name */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
              style={
                selected
                  ? {
                      borderColor: "var(--accent-secondary)",
                      backgroundColor: "var(--bg-elevated)",
                    }
                  : undefined
              }
              className="royal-card royal-card-hover rounded-2xl p-6 flex flex-col items-center justify-center gap-3 text-center transition-all"
            >
              <div
                style={{
                  color: selected
                    ? "var(--accent-secondary)"
                    : "var(--text-muted)",
                }}
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--border-subtle)]"
              >
                <PortalIcon role={role} />
              </div>
              <span className="text-sm sm:text-base font-bold tracking-wide">
                {lang === "ur" ? meta.urduTitle : meta.title}
              </span>
            </button>
          );
        })}
      </div>

      {/* Minimal Sign-In Card */}
      <form
        onSubmit={handleLogin}
        className="royal-card max-w-md mx-auto rounded-2xl p-6 sm:p-8 space-y-5"
      >
        <div className="text-center border-b border-[var(--border-subtle)] pb-4">
          <h2 className="text-lg font-bold">
            {lang === "ur" ? activeMeta.urduTitle : activeMeta.title}
          </h2>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300 space-y-2 text-center">
            <p>{error}</p>
            {suggestedRole && (
              <button
                type="button"
                onClick={() => {
                  setSelectedPortal(suggestedRole);
                  setError("");
                  setSuggestedRole(null);
                }}
                className="royal-btn rounded-lg px-3 py-1 text-xs"
              >
                {PORTAL_META[suggestedRole].title}
              </button>
            )}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
            {t("email")}
          </label>
          <input
            type="email"
            required
            placeholder="name@domain.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="royal-input w-full"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
            {t("password")}
          </label>
          <input
            type="password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="royal-input w-full"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="royal-btn w-full inline-flex items-center justify-center gap-2 rounded-xl py-3 text-sm disabled:opacity-60"
        >
          <LogIn className="h-4 w-4" />
          <span>{submitting ? "..." : t("signIn")}</span>
        </button>
      </form>
    </div>
  );
}
