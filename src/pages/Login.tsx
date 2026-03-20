import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export function Login() {
  const navigate = useNavigate()
  const { user, signIn, signUp, signInWithMagicLink, signOut, isConfigured } =
    useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'register' | 'magic'>('login')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Redirect to home after login
  useEffect(() => {
    if (user && !success) {
      navigate('/', { replace: true })
    }
  }, [user, navigate, success])

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

  // Already logged in — show profile
  if (user) {
    return (
      <div className="px-4 py-6 max-w-sm mx-auto mt-12 text-center">
        <div className="w-16 h-16 rounded-full bg-blue-600/20 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl text-blue-400">
            {user.email?.charAt(0).toUpperCase()}
          </span>
        </div>
        <p className="text-white font-medium">{user.email}</p>
        <p className="text-zinc-500 text-xs mt-1">Eingeloggt</p>
        <button
          onClick={async () => {
            await signOut()
            navigate('/', { replace: true })
          }}
          className="mt-6 px-6 py-2.5 bg-zinc-800 rounded-xl text-sm text-zinc-300 hover:bg-zinc-700"
        >
          Ausloggen
        </button>
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
      if (error) {
        setError(error)
      } else {
        setSuccess('Account erstellt!')
        // Auto-login after registration
        const { error: loginError } = await signIn(email, password)
        if (!loginError) {
          navigate('/', { replace: true })
          return
        }
      }
    } else {
      const { error } = await signIn(email, password)
      if (error) {
        setError(error)
      }
      // useEffect handles redirect on user change
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

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
            <p className="text-red-400 text-xs">{error}</p>
          </div>
        )}
        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5">
            <p className="text-emerald-400 text-xs">{success}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-500 disabled:opacity-50 transition-colors"
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
          <button
            onClick={() => {
              setMode('login')
              setError(null)
              setSuccess(null)
            }}
            className="hover:text-white"
          >
            Login
          </button>
        )}
        {mode !== 'register' && (
          <button
            onClick={() => {
              setMode('register')
              setError(null)
              setSuccess(null)
            }}
            className="hover:text-white"
          >
            Registrieren
          </button>
        )}
        {mode !== 'magic' && (
          <button
            onClick={() => {
              setMode('magic')
              setError(null)
              setSuccess(null)
            }}
            className="hover:text-white"
          >
            Magic Link
          </button>
        )}
      </div>
    </div>
  )
}
