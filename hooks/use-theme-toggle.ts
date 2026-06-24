"use client"

import { useCallback } from "react"
import { useTheme } from "next-themes"
import { flushSync } from "react-dom"

interface ToggleThemeOptions {
  /**
   * Element the circular view-transition reveal should originate from.
   * Falls back to the center of the viewport when omitted.
   */
  origin?: HTMLElement | null
  duration?: number
}

/**
 * Shared theme toggle that performs a circular view-transition reveal.
 * Used by the toggle button and the global keyboard shortcut so both
 * animate identically.
 */
export function useThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  const toggleTheme = useCallback(
    async ({ origin, duration = 400 }: ToggleThemeOptions = {}) => {
      const newTheme = isDark ? "light" : "dark"

      if (!document.startViewTransition) {
        setTheme(newTheme)
        return
      }

      await document.startViewTransition(() => {
        flushSync(() => {
          setTheme(newTheme)
        })
      }).ready

      const rect = origin?.getBoundingClientRect()
      const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
      const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2
      const maxRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      )

      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${maxRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration,
          easing: "ease-in-out",
          pseudoElement: "::view-transition-new(root)",
        }
      )
    },
    [isDark, setTheme]
  )

  return { isDark, toggleTheme }
}
