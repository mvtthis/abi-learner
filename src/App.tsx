import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { getSettings } from '@/lib/db'
import { Layout } from '@/components/Layout'
import { Dashboard } from '@/pages/Dashboard'
import { Review } from '@/pages/Review'
import { Browse } from '@/pages/Browse'
import { Import } from '@/pages/Import'
import { Explore } from '@/pages/Explore'
import { Login } from '@/pages/Login'
import { WeakTopics } from '@/pages/WeakTopics'
import { Onboarding } from '@/pages/Onboarding'

function AppRouter() {
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(
    null
  )

  useEffect(() => {
    getSettings().then((s) => setOnboardingComplete(s.onboarding_complete))
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
        <Route path="/weak" element={<WeakTopics />} />
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
