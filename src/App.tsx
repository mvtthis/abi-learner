import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { getSettings, seedInitialSnapshot } from '@/lib/db'
import { Layout } from '@/components/Layout'
import { Dashboard } from '@/pages/Dashboard'
import { Review } from '@/pages/Review'
import { Browse } from '@/pages/Browse'
import { Import } from '@/pages/Import'
import { Explore } from '@/pages/Explore'
import { Login } from '@/pages/Login'
import { Progress } from '@/pages/Progress'
import { Onboarding } from '@/pages/Onboarding'

function AppRouter() {
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(
    null
  )

  useEffect(() => {
    async function init() {
      const s = await getSettings()
      setOnboardingComplete(s.onboarding_complete)
      await seedInitialSnapshot()
    }
    init()
  }, [])

  const completeOnboarding = () => setOnboardingComplete(true)

  if (onboardingComplete === null) {
    return (
      <div className="min-h-dvh bg-black flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!onboardingComplete) {
    return (
      <Routes>
        <Route path="/onboarding" element={<Onboarding onComplete={completeOnboarding} />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/review" element={<Review />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/import" element={<Import />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/login" element={<Login />} />
      </Route>
      <Route path="/onboarding" element={<Onboarding onComplete={completeOnboarding} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  )
}
