/** Local visit reminders for planned watchlist visits (browser Notification API). */

import { readScopedItem, writeScopedItem } from './ownerScope'
import { loadWatchlist, updateWatchlistItem, type WatchlistItem } from './watchlistStorage'

export const REMINDER_FIRED_KEY = 'bfi.visit-reminders-fired'

const LEAD_MS = 60 * 60 * 1000 // notify from 1h before
const LATE_MS = 30 * 60 * 1000 // until 30m after planned time

function loadFiredMap(): Record<string, string> {
  try {
    const raw = readScopedItem(REMINDER_FIRED_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, string>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function persistFiredMap(map: Record<string, string>) {
  writeScopedItem(REMINDER_FIRED_KEY, JSON.stringify(map))
}

function firedKey(item: WatchlistItem) {
  return `${item.id}:${item.plannedVisitAt ?? ''}`
}

export function notificationsSupported() {
  return typeof window !== 'undefined' && 'Notification' in window
}

export async function ensureNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationsSupported()) return 'unsupported'
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission
  }
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

export function setVisitReminder(propertyId: string, enabled: boolean) {
  return updateWatchlistItem(propertyId, { reminderEnabled: enabled })
}

export function formatReminderLabel(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

function showVisitNotification(item: WatchlistItem) {
  if (!notificationsSupported() || Notification.permission !== 'granted') return false
  if (!item.plannedVisitAt) return false

  const when = formatReminderLabel(item.plannedVisitAt)
  try {
    const note = new Notification('Visit reminder', {
      body: `${item.address} — planned for ${when}`,
      tag: `bfi-visit-${item.id}`,
      silent: false,
    })
    note.onclick = () => {
      window.focus()
      note.close()
    }
    return true
  } catch {
    return false
  }
}

/** Fire due reminders for planned (not yet visited) properties with reminders on. */
export function checkDueVisitReminders(now = Date.now()) {
  if (!notificationsSupported() || Notification.permission !== 'granted') return 0

  const fired = loadFiredMap()
  let count = 0

  for (const item of loadWatchlist()) {
    if (!item.reminderEnabled || !item.plannedVisitAt || item.visitedAt) continue
    const planned = new Date(item.plannedVisitAt).getTime()
    if (Number.isNaN(planned)) continue
    if (now < planned - LEAD_MS || now > planned + LATE_MS) continue

    const key = firedKey(item)
    if (fired[key]) continue

    if (showVisitNotification(item)) {
      fired[key] = new Date(now).toISOString()
      count += 1
    }
  }

  if (count > 0) persistFiredMap(fired)
  return count
}

export async function enableReminderForPlan(propertyId: string): Promise<{
  ok: boolean
  reason?: 'unsupported' | 'denied'
}> {
  const permission = await ensureNotificationPermission()
  if (permission === 'unsupported') {
    setVisitReminder(propertyId, false)
    return { ok: false, reason: 'unsupported' }
  }
  if (permission !== 'granted') {
    setVisitReminder(propertyId, false)
    return { ok: false, reason: 'denied' }
  }
  setVisitReminder(propertyId, true)
  checkDueVisitReminders()
  return { ok: true }
}
