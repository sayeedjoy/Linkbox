"use client"

import { useEffect } from "react"

import { useThemeToggle } from "@/hooks/use-theme-toggle"

/**
 * Global keyboard shortcut: press "D" to toggle between light and dark theme.
 * Ignored while typing in inputs/textareas/contenteditable or with modifier keys.
 */
export function ThemeKeyboardShortcut() {
  const { toggleTheme } = useThemeToggle()

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "d") return
      if (event.metaKey || event.ctrlKey || event.altKey) return

      const target = event.target as HTMLElement | null
      if (
        target?.isContentEditable ||
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT"
      ) {
        return
      }

      event.preventDefault()
      void toggleTheme()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [toggleTheme])

  return null
}
