import { Navigate, Route, Routes } from 'react-router-dom'
import { HomeScreen } from '@/screens/HomeScreen'
import { PropertyDetailScreen } from '@/screens/PropertyDetailScreen'
import { WatchlistScreen } from '@/screens/WatchlistScreen'
import { JourneyScreen } from '@/screens/JourneyScreen'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeScreen />} />
      <Route path="/property/:address" element={<PropertyDetailScreen />} />
      <Route path="/watchlist" element={<WatchlistScreen />} />
      <Route path="/journey" element={<JourneyScreen />} />
      <Route path="/audit" element={<Navigate to="/journey" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
