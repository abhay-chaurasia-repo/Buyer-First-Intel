import { Navigate, Route, Routes } from 'react-router-dom'
import { HomeScreen } from '@/screens/HomeScreen'
import { PropertyDetailScreen } from '@/screens/PropertyDetailScreen'
import { WatchlistScreen } from '@/screens/WatchlistScreen'
import { AuditScreen } from '@/screens/AuditScreen'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeScreen />} />
      <Route path="/property/:address" element={<PropertyDetailScreen />} />
      <Route path="/watchlist" element={<WatchlistScreen />} />
      <Route path="/audit" element={<AuditScreen />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
