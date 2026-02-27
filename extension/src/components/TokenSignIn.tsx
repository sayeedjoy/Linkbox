import { useState } from 'react'
import { Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { setToken } from '@/popup/lib/messaging'
import { WEB_APP_URL } from '@/lib/constants'
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
      setError('Failed to save token')
    }
  }

  return (
    <div className={cn('flex flex-col items-center justify-center gap-5 p-6 min-h-[250px]', className)}>
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Link2 className="h-6 w-6" />
      </div>
      <div className="text-center space-y-1">
        <h1 className="text-lg font-semibold text-foreground">LinkBox</h1>
        <p className="text-sm text-muted-foreground">Welcome, Sign in below.</p>
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
          {loading ? 'Saving…' : 'Save token'}
        </Button>
      </form>
      <a
        href={WEB_APP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        Open LinkBox web app to get a token
      </a>
    </div>
  )
}
