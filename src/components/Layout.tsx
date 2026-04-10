import { NavLink, Outlet, Link } from 'react-router-dom'
import { SyncIndicator } from './SyncIndicator'
import { useAuth } from '@/hooks/useAuth'
import { useSync } from '@/hooks/useSync'
import { useDueCount } from '@/hooks/useReviewSession'

const navItems = [
  { to: '/', icon: '🏠', label: 'Home' },
  { to: '/review', icon: '📖', label: 'Lernen' },
  { to: '/weak', icon: '🎯', label: 'Schwächen' },
  { to: '/explore', icon: '📚', label: 'Decks' },
]

export function Layout() {
  const { user } = useAuth()
  const { isOnline, isSyncing, pendingCount, sync } = useSync(
    user?.id ?? null
  )
  const { reviewCount } = useDueCount()

  return (
    <div className="min-h-dvh bg-black text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-zinc-900">
        <h1 className="text-base font-bold tracking-tight">Abi-Learner</h1>
        <div className="flex items-center gap-2">
          <SyncIndicator
            isOnline={isOnline}
            isSyncing={isSyncing}
            pendingCount={pendingCount}
            onSync={sync}
          />
          {user ? (
            <span className="text-[10px] text-zinc-500 max-w-[100px] truncate">
              {user.email}
            </span>
          ) : (
            <Link
              to="/login"
              className="text-xs text-blue-400 px-2 py-1 rounded-lg hover:bg-zinc-800"
            >
              Login
            </Link>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur border-t border-zinc-900 safe-area-bottom">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center py-2 px-4 text-xs transition-colors relative ${
                  isActive ? 'text-blue-400' : 'text-zinc-500'
                }`
              }
            >
              <span className="text-xl mb-0.5">{item.icon}</span>
              <span>{item.label}</span>
              {item.to === '/review' && reviewCount > 0 && (
                <span className="absolute -top-0.5 right-2 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {reviewCount > 99 ? '99' : reviewCount}
                </span>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
