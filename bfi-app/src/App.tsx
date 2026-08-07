import { Navigate, Route, Routes } from 'react-router-dom'
import { hasSeenImpact } from '@/data/impactStory'
import { HomeScreen } from '@/screens/HomeScreen'
import { PropertyDetailScreen } from '@/screens/PropertyDetailScreen'
import { WatchlistScreen } from '@/screens/WatchlistScreen'
import { JourneyScreen } from '@/screens/JourneyScreen'
import { GuidanceScreen } from '@/screens/GuidanceScreen'
import { InAppBrowserScreen } from '@/screens/InAppBrowserScreen'
import { ImpactStoryScreen } from '@/screens/ImpactStoryScreen'
import { LoginScreen } from '@/screens/LoginScreen'

function RootEntry() {
  if (!hasSeenImpact()) {
    return <Navigate to="/welcome" replace />
  }
  return <HomeScreen />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootEntry />} />
      <Route path="/welcome" element={<ImpactStoryScreen />} />
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/property/:address" element={<PropertyDetailScreen />} />
      <Route path="/watchlist" element={<WatchlistScreen />} />
      <Route path="/journey" element={<JourneyScreen />} />
      <Route path="/guidance/:docId" element={<GuidanceScreen />} />
      <Route path="/browse" element={<InAppBrowserScreen />} />
      <Route path="/audit" element={<Navigate to="/journey" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
