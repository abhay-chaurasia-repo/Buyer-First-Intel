import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Bell,
  BookMarked,
  CheckCircle2,
  Hash,
  MapPin,
  MessageSquareText,
  NotebookPen,
  School,
  ShieldAlert,
  Users,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import {
  DEMO_PROPERTY,
  PROPERTY_CHANNELS,
  resolvePropertyFromQuery,
  type PropertyChannelId,
} from '@/data/mockProperty'
import { cn } from '@/lib/utils'

const channelIcons: Record<PropertyChannelId, typeof Hash> = {
  'catch-up': Bell,
  huddle: Users,
  later: BookMarked,
  threads: MessageSquareText,
  announcements: ShieldAlert,
  schools: School,
  neighborhood: MapPin,
  'verified-visits': CheckCircle2,
  'personal-notes': NotebookPen,
}

function ChannelPanel({
  channelId,
  propertyAddress,
}: {
  channelId: PropertyChannelId
  propertyAddress: string
}) {
  const panels: Record<PropertyChannelId, { title: string; body: string; items: string[] }> = {
    'catch-up': {
      title: 'Catch up',
      body: 'A concise brief of what moved since your last session.',
      items: [
        'County sqft still reads 2,509 — claimed figure differs.',
        '2 new structured neighborhood signals this week.',
        'Checklist: 4 of 14 diligence items complete.',
      ],
    },
    huddle: {
      title: 'Huddle',
      body: 'Pressure-test mismatches before you walk or offer.',
      items: [
        'Sqft gap: county 2,509 vs claimed 2,924 (−14%).',
        'Confirm finished basement vs living area classification.',
        'Ask listing source which rooms are included in claimed size.',
      ],
    },
    later: {
      title: 'Later',
      body: 'Deferred items parked until your next visit.',
      items: [
        'Pull flood-zone overlay for the lot.',
        'Confirm HOA documents if subdivision applies.',
        'Re-check roof age after on-site look.',
      ],
    },
    threads: {
      title: 'Threads',
      body: 'Structured observation threads — not a public comment feed.',
      items: [
        'Parking: street parking tight after 6pm (2 buyers).',
        'Noise: evening traffic audible from front rooms (1 buyer).',
        'Condition: possible garage conversion — verify permits.',
      ],
    },
    announcements: {
      title: 'Announcements',
      body: 'Record updates and diligence alerts for this property.',
      items: [
        'Public-record snapshot refreshed from ATTOM.',
        'Presence confirmation is available within 100m.',
        'Free-tier audit credits remain active for this lookup.',
      ],
    },
    schools: {
      title: 'Schools',
      body: 'District context for planning — not a rankings marketplace.',
      items: [
        'Assigned elementary: Oak Ridge Elementary.',
        'Assigned middle: South Austin Middle.',
        'Verify boundaries directly with the district before deciding.',
      ],
    },
    neighborhood: {
      title: 'Neighborhood',
      body: 'Aggregated buyer signals around the property — not sentiment scores.',
      items: [
        '3 buyers noted evening street noise.',
        '4 buyers confirmed limited driveway depth.',
        'No public free-text comments are shown here.',
      ],
    },
    'verified-visits': {
      title: 'Verified visits',
      body: 'GPS presence confirmations within 100 meters of the property.',
      items: [
        `${DEMO_PROPERTY.verifiedVisits} verified visits recorded.`,
        'Tap Visit from the field when you arrive — no dwell timer.',
        'Verified presence unlocks stronger contribution weight.',
      ],
    },
    'personal-notes': {
      title: 'Personal notes',
      body: 'Private workspace notes for this address. Only you can see these.',
      items: [
        `Touring ${propertyAddress} Saturday morning.`,
        'Ask about foundation report and water heater age.',
        'Compare claimed living area against county living area only.',
      ],
    },
  }

  const panel = panels[channelId]

  return (
    <div className="animate-bfi-channel-in space-y-4" key={channelId}>
      <div>
        <h2 className="font-display text-xl font-semibold tracking-tight text-ink">{panel.title}</h2>
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">{panel.body}</p>
      </div>
      <ul className="space-y-3">
        {panel.items.map((item) => (
          <li
            key={item}
            className="rounded-2xl border border-line bg-paper-elevated px-4 py-3 text-sm leading-relaxed text-ink shadow-sm"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function PropertyDetailScreen() {
  const { address = '' } = useParams<{ address: string }>()
  const decoded = decodeURIComponent(address)
  const property = useMemo(() => resolvePropertyFromQuery(decoded || DEMO_PROPERTY.address), [decoded])
  const [activeChannel, setActiveChannel] = useState<PropertyChannelId>('catch-up')

  const sqftDelta =
    property.claimedSqft && property.sqft
      ? Math.round(((property.sqft - property.claimedSqft) / property.claimedSqft) * 100)
      : null

  return (
    <AppShell contentClassName="min-h-0">
      <header className="sticky top-0 z-20 border-b border-line bg-paper-elevated/95 backdrop-blur-md">
        <div className="flex items-start gap-3 px-4 pb-3 pt-4">
          <Link
            to="/"
            className="mt-0.5 inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-line bg-paper text-ink-muted transition-colors hover:text-ink touch-manipulation"
            aria-label="Back to search"
            data-testid="button-back-home"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="font-display text-[11px] font-semibold tracking-[0.16em] text-action uppercase">
              Property command center
            </p>
            <h1 className="truncate font-display text-lg font-semibold tracking-tight text-ink">
              {property.address}
            </h1>
            <p className="truncate text-sm text-ink-muted">
              {property.city}, {property.state} {property.zipCode}
            </p>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto px-4 pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="shrink-0 rounded-full border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-ink">
            County {property.sqft.toLocaleString()} sqft
          </div>
          {property.claimedSqft ? (
            <div className="shrink-0 rounded-full border border-alert/30 bg-alert-soft px-3 py-1.5 text-xs font-semibold text-alert">
              Claimed {property.claimedSqft.toLocaleString()} sqft
              {sqftDelta !== null ? ` (${sqftDelta}%)` : ''}
            </div>
          ) : null}
          <div className="shrink-0 rounded-full border border-verified/25 bg-verified-soft px-3 py-1.5 text-xs font-semibold text-verified">
            {property.verifiedVisits} verified visits
          </div>
          <div className="shrink-0 rounded-full border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-ink-muted">
            {property.bedrooms} bd · {property.bathrooms} ba · Built {property.yearBuilt}
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside
          className="border-b border-line bg-[#0b1220] text-white md:w-56 md:shrink-0 md:border-b-0 md:border-r md:border-line"
          aria-label="Property channels"
        >
          <div className="px-4 pb-2 pt-3">
            <p className="font-display text-[11px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
              Channels
            </p>
          </div>
          <div className="flex gap-1 overflow-x-auto px-2 pb-3 md:flex-col md:overflow-visible md:px-2 md:pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {PROPERTY_CHANNELS.map((channel) => {
              const Icon = channelIcons[channel.id]
              const isActive = activeChannel === channel.id
              return (
                <button
                  key={channel.id}
                  type="button"
                  onClick={() => setActiveChannel(channel.id)}
                  className={cn(
                    'flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors touch-manipulation md:w-full',
                    isActive
                      ? 'bg-action text-white'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white',
                  )}
                  aria-pressed={isActive}
                  data-testid={`channel-${channel.id}`}
                >
                  <Hash className="h-3.5 w-3.5 opacity-70" aria-hidden />
                  <Icon className="hidden h-4 w-4 md:block" aria-hidden />
                  <span className="font-medium">{channel.name}</span>
                  {channel.unread ? (
                    <span
                      className={cn(
                        'ml-auto rounded-md px-1.5 py-0.5 text-[10px] font-bold',
                        isActive ? 'bg-white/20 text-white' : 'bg-action text-white',
                      )}
                    >
                      {channel.unread}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </aside>

        <section className="flex-1 px-4 py-5 sm:px-5" aria-live="polite">
          <ChannelPanel channelId={activeChannel} propertyAddress={property.address} />
        </section>
      </div>
    </AppShell>
  )
}
