import { useState, useEffect } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { STORAGE_KEYS } from '@/lib/constants'

export type ThemeValue = 'light' | 'dark' | 'system'

function applyTheme(value: ThemeValue) {
  const root = document.documentElement
  let dark = false
  if (value === 'dark') dark = true
  if (value === 'light') dark = false
  if (value === 'system') dark = window.matchMedia('(prefers-color-scheme: dark)').matches
  if (dark) root.classList.add('dark')
  else root.classList.remove('dark')
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeValue>('system')

  useEffect(() => {
    chrome.storage.local.get(STORAGE_KEYS.theme, (out) => {
      const stored = out[STORAGE_KEYS.theme]
      const value: ThemeValue = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system'
      setThemeState(value)
      applyTheme(value)
    })
  }, [])

  const setTheme = (value: ThemeValue) => {
    setThemeState(value)
    chrome.storage.local.set({ [STORAGE_KEYS.theme]: value })
    applyTheme(value)
  }

  return { theme, setTheme }
}

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Theme">
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as ThemeValue)}>
          <DropdownMenuRadioItem value="light">
            <Sun className="mr-2 h-4 w-4" />
            Light
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon className="mr-2 h-4 w-4" />
            Dark
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Monitor className="mr-2 h-4 w-4" />
            System
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function initTheme() {
  chrome.storage.local.get(STORAGE_KEYS.theme, (out) => {
    const stored = out[STORAGE_KEYS.theme]
    const value: ThemeValue = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system'
    applyTheme(value)
  })
}
