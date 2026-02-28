import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { setToken } from '@/popup/lib/messaging'
import { WEB_APP_URL, LOGO_URL } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface TokenSignInProps {
  onSuccess: () => void
  className?: string
}

export default function TokenSignIn({ onSuccess, className }: TokenSignInProps) {
  const [token, setTokenValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const trimmed = token.trim()
    if (!trimmed) {
      setError('Enter your API token')
      return
    }
    setLoading(true)
    const result = await setToken(trimmed)
    setLoading(false)
    if (result.success) {
      onSuccess()
    } else {
      setError('Invalid token. Check the token or get a new one from the web app.')
    }
  }

  return (
    <div className={cn('flex flex-col items-center justify-center gap-5 p-6 min-h-[250px]', className)}>
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full overflow-hidden bg-primary">
        <img src={LOGO_URL} alt="" className="h-7 w-7 object-contain" />
      </div>
      <div className="text-center space-y-1">
        <h1 className="text-lg font-semibold text-foreground">LinkArena</h1>
        <p className="text-sm text-muted-foreground">
          Stored only in chrome.storage.local. Token stays valid until revoked.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="w-full space-y-3 max-w-[280px]">
        <Input
          type="text"
          value={token}
          onChange={(e) => setTokenValue(e.target.value)}
          placeholder="Paste your API token"
          disabled={loading}
          autoComplete="off"
          className="w-full"
        />
        {error && <p className="text-sm text-destructive text-center">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Saving...' : 'Save token'}
        </Button>
      </form>
      <a
        href={WEB_APP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        Open Bookmark web app to get a token
      </a>
    </div>
  )
}
