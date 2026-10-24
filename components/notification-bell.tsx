"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Bell, BellRing, CheckCheck } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { useApp } from "./app-context";

export function NotificationBell() {
  const {
    user,
    settings,
    t,
    notifications,
    unreadCount,
    markAllNotificationsRead,
    requestBrowserNotifications,
    browserNotifPermission,
    toast,
  } = useApp();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next && unreadCount > 0) {
            markAllNotificationsRead();
          }
        }}
        aria-label={t("notifications")}
        className="royal-btn-outline relative inline-flex h-9 w-9 items-center justify-center rounded-xl"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span
            style={{ backgroundColor: "var(--accent-secondary)" }}
            className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-extrabold text-slate-950"
          >
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-subtle)",
            }}
            className="absolute end-0 mt-2 z-50 w-80 sm:w-96 rounded-2xl border p-4 shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
              <span className="text-sm font-bold">{t("notifications")}</span>
              {browserNotifPermission === "default" && (
                <button
                  type="button"
                  onClick={async () => {
                    const granted = await requestBrowserNotifications();
                    if (granted) {
                      toast("Web desktop notifications enabled!");
                    }
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold gold-accent hover:underline"
                >
                  <BellRing className="h-3.5 w-3.5" />
                  <span>{t("enableAlerts")}</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={markAllNotificationsRead}
                  className="text-xs text-muted-royal hover:opacity-100 inline-flex items-center gap-1"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-royal">
                {t("noRecords")}
              </p>
            ) : (
              <div className="max-h-72 overflow-y-auto space-y-2">
                {notifications.map((item) => (
                  <Link
                    key={item.id}
                    href={item.link || "/portals"}
                    onClick={() => setOpen(false)}
                    className="royal-elevated block rounded-xl p-3 text-xs space-y-1 hover:border-[var(--accent-primary)] transition-colors"
                  >
                    <div className="font-bold">{item.title}</div>
                    <div className="text-muted-royal">{item.body}</div>
                    <div className="text-[10px] text-muted-royal opacity-75">
                      {formatDateTime(item.createdAt, settings.timezone)}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
