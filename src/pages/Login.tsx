import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'

export function Login() {
  const { signIn, signUp, signInWithMagicLink, isConfigured } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'register' | 'magic'>('login')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (!isConfigured) {
    return (
      <div className="px-4 py-6 max-w-sm mx-auto text-center mt-20">
        <h2 className="text-xl font-bold text-white mb-2">Login</h2>
        <p className="text-zinc-500 text-sm">
          Supabase nicht konfiguriert. Die App funktioniert auch ohne Login —
          alle Daten werden lokal gespeichert.
        </p>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    if (mode === 'magic') {
      const { error } = await signInWithMagicLink(email)
      if (error) setError(error)
      else setSuccess('Magic Link gesendet! Prüfe deine E-Mails.')
    } else if (mode === 'register') {
      const { error } = await signUp(email, password)
      if (error) setError(error)
      else setSuccess('Registrierung erfolgreich! Prüfe deine E-Mails.')
    } else {
      const { error } = await signIn(email, password)
      if (error) setError(error)
    }
    setLoading(false)
  }

  return (
    <div className="px-4 py-6 max-w-sm mx-auto mt-12">
      <h2 className="text-xl font-bold text-white text-center mb-6">
        {mode === 'register'
          ? 'Registrieren'
          : mode === 'magic'
          ? 'Magic Link'
          : 'Login'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-Mail"
          required
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
        />
        {mode !== 'magic' && (
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Passwort"
            required
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
          />
        )}

        {error && <p className="text-red-400 text-xs">{error}</p>}
        {success && <p className="text-emerald-400 text-xs">{success}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-500 disabled:opacity-50"
        >
          {loading
            ? '...'
            : mode === 'register'
            ? 'Registrieren'
            : mode === 'magic'
            ? 'Magic Link senden'
            : 'Einloggen'}
        </button>
      </form>

      <div className="flex justify-center gap-4 mt-4 text-xs text-zinc-500">
        {mode !== 'login' && (
          <button onClick={() => setMode('login')} className="hover:text-white">
            Login
          </button>
        )}
        {mode !== 'register' && (
          <button
            onClick={() => setMode('register')}
            className="hover:text-white"
          >
            Registrieren
          </button>
        )}
        {mode !== 'magic' && (
          <button
            onClick={() => setMode('magic')}
            className="hover:text-white"
          >
            Magic Link
          </button>
        )}
      </div>
    </div>
  )
}
