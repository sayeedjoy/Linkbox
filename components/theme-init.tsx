"use client";

import { useEffect } from "react";

const THEME_KEY = "bookmark-theme";

export function ThemeInit() {
  useEffect(() => {
    const theme = localStorage.getItem(THEME_KEY) as "light" | "dark" | "system" | null;
    if (theme === "dark") document.documentElement.classList.add("dark");
    else if (theme === "light") document.documentElement.classList.remove("dark");
    else if (theme === "system") {
      const prefers = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefers) document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
    }
  }, []);
  return null;
}
