import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { HomeScreen } from '@/screens/HomeScreen'
import { PropertyDetailScreen } from '@/screens/PropertyDetailScreen'

function PlaceholderScreen({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <AppShell>
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="animate-bfi-rise max-w-sm">
          <p className="font-display text-[11px] font-semibold tracking-[0.16em] text-action uppercase">
            BFI
          </p>
          <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{description}</p>
        </div>
      </div>
    </AppShell>
  )
}

function WatchlistScreen() {
  return (
    <PlaceholderScreen
      title="Watchlist"
      description="Saved properties will live here. Start from Search to open a property command center."
    />
  )
}

function AuditScreen() {
  return (
    <PlaceholderScreen
      title="Audit"
      description="Your due-diligence checklist workspace. Open a property to continue the audit flow."
    />
  )
}

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
