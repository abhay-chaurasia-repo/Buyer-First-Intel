import { Navigate, Route, Routes } from 'react-router-dom'
import { MobileFrame } from '@/components/layout/MobileFrame'
import { hasSeenImpact } from '@/data/impactStory'
import { HomeScreen } from '@/screens/HomeScreen'
import { PropertyDetailScreen } from '@/screens/PropertyDetailScreen'
import { WatchlistScreen } from '@/screens/WatchlistScreen'
import { JourneyScreen } from '@/screens/JourneyScreen'
import { RulesOfEngagementScreen } from '@/screens/RulesOfEngagementScreen'
import { GuidanceScreen } from '@/screens/GuidanceScreen'
import { InAppBrowserScreen } from '@/screens/InAppBrowserScreen'
import { ImpactStoryScreen } from '@/screens/ImpactStoryScreen'
import { LoginScreen, SignupScreen } from '@/screens/AuthOptionsScreen'

function RootEntry() {
  if (!hasSeenImpact()) {
    return <Navigate to="/welcome" replace />
  }
  return <HomeScreen />
}

export default function App() {
  return (
    <MobileFrame>
      <Routes>
        <Route path="/" element={<RootEntry />} />
        <Route path="/welcome" element={<ImpactStoryScreen />} />
        <Route path="/signup" element={<SignupScreen />} />
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/property/:address" element={<PropertyDetailScreen />} />
        <Route path="/watchlist" element={<WatchlistScreen />} />
        <Route path="/journey" element={<JourneyScreen />} />
        <Route path="/rules" element={<RulesOfEngagementScreen />} />
        <Route path="/guidance/:docId" element={<GuidanceScreen />} />
        <Route path="/browse" element={<InAppBrowserScreen />} />
        <Route path="/audit" element={<Navigate to="/journey" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MobileFrame>
  )
}
