"use client";

import React from "react";

export function UserAvatar({
  name,
  avatarUrl,
  size = "md",
  glowing = false,
}: {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  glowing?: boolean;
}) {
  const dims =
    size === "sm"
      ? "h-8 w-8 text-xs rounded-full"
      : size === "lg"
      ? "h-14 w-14 text-base rounded-2xl"
      : size === "xl"
      ? "h-20 w-20 text-xl rounded-2xl"
      : "h-11 w-11 text-sm rounded-full";

  const initials = (name || "U")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`${dims} shrink-0 object-cover border border-[var(--border-subtle)] bg-[var(--bg-elevated)] transition-all ${
          glowing ? "attendance-glow-avatar" : ""
        }`}
      />
    );
  }

  return (
    <div
      className={`${dims} royal-elevated shrink-0 flex items-center justify-center font-extrabold gold-accent transition-all ${
        glowing ? "attendance-glow-avatar" : ""
      }`}
    >
      {initials}
    </div>
  );
}

export function resizeAvatarFile(
  file: File,
  onReady: (dataUrl: string) => void
) {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const target = 256;
      const canvas = document.createElement("canvas");
      canvas.width = target;
      canvas.height = target;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Center square cover crop
      const minSide = Math.min(img.width, img.height);
      const sx = Math.floor((img.width - minSide) / 2);
      const sy = Math.floor((img.height - minSide) / 2);
      ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, target, target);
      onReady(canvas.toDataURL("image/webp", 0.88));
    };
    img.src = String(reader.result);
  };
  reader.readAsDataURL(file);
}
