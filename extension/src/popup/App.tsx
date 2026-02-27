import { useState, useEffect } from 'react'
import TokenSignIn from '@/components/TokenSignIn'
import BookmarksView from '@/components/BookmarksView'
import { initTheme } from '@/components/ThemeToggle'
import { getToken } from '@/popup/lib/messaging'
import '@/globals.css'
import './App.css'

export default function App() {
  const [hasToken, setHasToken] = useState<boolean | null>(null)

  useEffect(() => {
    initTheme()
  }, [])

  const checkToken = async () => {
    const token = await getToken()
    setHasToken(!!token)
  }

  useEffect(() => {
    checkToken()
  }, [])

  if (hasToken === null) {
    return (
      <div className="popup-root flex items-center justify-center min-h-[250px]">
        <span className="text-muted-foreground text-sm">Loading…</span>
      </div>
    )
  }

  if (!hasToken) {
    return (
      <div className="popup-root popup-signed-out">
        <TokenSignIn onSuccess={checkToken} />
      </div>
    )
  }

  return (
    <div className="popup-root popup-signed-in">
      <BookmarksView onSignOut={checkToken} />
    </div>
  )
}
