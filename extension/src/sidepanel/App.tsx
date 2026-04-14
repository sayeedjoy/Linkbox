import { useState, useEffect } from 'react'
import TokenSignIn from '@/components/TokenSignIn'
import BookmarksView from '@/components/BookmarksView'
import { initTheme } from '@/components/ThemeToggle'
import { getToken } from '@/popup/lib/messaging'

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
      <div className="flex items-center justify-center h-screen">
        <span className="text-muted-foreground text-sm">Loading…</span>
      </div>
    )
  }

  if (!hasToken) {
    return (
      <div className="flex items-center justify-center h-screen">
        <TokenSignIn onSuccess={checkToken} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      <BookmarksView onSignOut={checkToken} />
    </div>
  )
}
