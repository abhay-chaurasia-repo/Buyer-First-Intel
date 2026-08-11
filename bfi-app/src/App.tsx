import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from '@/auth/RequireAuth'
import { MobileFrame } from '@/components/layout/MobileFrame'
import { hasSeenImpact } from '@/data/impactStory'
import { HomeScreen } from '@/screens/HomeScreen'
import { PropertyDetailScreen } from '@/screens/PropertyDetailScreen'
import { WatchlistScreen } from '@/screens/WatchlistScreen'
import { JourneyScreen } from '@/screens/JourneyScreen'
import { RulesOfEngagementScreen } from '@/screens/RulesOfEngagementScreen'
import { GuidanceScreen } from '@/screens/GuidanceScreen'
import { ImpactStoryScreen } from '@/screens/ImpactStoryScreen'
import { LoginScreen, SignupScreen } from '@/screens/AuthOptionsScreen'

function RootEntry() {
  if (!hasSeenImpact()) {
    return <Navigate to="/welcome" replace />
  }
  return (
    <RequireAuth>
      <HomeScreen />
    </RequireAuth>
  )
}

export default function App() {
  return (
    <MobileFrame>
      <Routes>
        <Route path="/" element={<RootEntry />} />
        <Route path="/welcome" element={<ImpactStoryScreen />} />
        <Route path="/signup" element={<SignupScreen />} />
        <Route path="/login" element={<LoginScreen />} />
        <Route
          path="/property/:address"
          element={
            <RequireAuth>
              <PropertyDetailScreen />
            </RequireAuth>
          }
        />
        <Route
          path="/watchlist"
          element={
            <RequireAuth>
              <WatchlistScreen />
            </RequireAuth>
          }
        />
        <Route
          path="/journey"
          element={
            <RequireAuth>
              <JourneyScreen />
            </RequireAuth>
          }
        />
        <Route path="/rules" element={<RulesOfEngagementScreen />} />
        <Route path="/guidance/:docId" element={<GuidanceScreen />} />
        <Route path="/browse" element={<Navigate to="/rules" replace />} />
        <Route path="/audit" element={<Navigate to="/journey" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MobileFrame>
  )
}
