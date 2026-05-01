import type { CSSProperties } from "react";

export function getUserInitials(
  name: string | null | undefined,
  email: string | null | undefined
): string {
  const source = (name?.trim() || email?.trim() || "?").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function getUserAvatarStyle(seed: string): CSSProperties {
  const normalized = seed.trim().toLowerCase() || "?";
  let h = 5381;
  for (let i = 0; i < normalized.length; i++) {
    h = ((h << 5) + h + normalized.charCodeAt(i)) | 0;
  }
  const n = Math.abs(h);
  const h1 = n % 360;
  const h2 = (h1 + 35 + (n % 50)) % 360;
  return {
    backgroundImage: `linear-gradient(135deg, hsl(${h1} 72% 56%), hsl(${h2} 72% 44%))`,
    color: "#ffffff",
    textShadow: "0 1px 2px rgba(0,0,0,0.25)",
  };
}

export function getUserAvatarSeed(
  name: string | null | undefined,
  email: string | null | undefined
): string {
  return (name?.trim() || email?.trim() || "user").toLowerCase();
}
