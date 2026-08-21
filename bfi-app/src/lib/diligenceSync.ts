/**
 * Cloud sync for Homes in Diligence + property notes (phone / Supabase users).
 * Local storage remains the fast cache; remote is source of truth after pull.
 */

import { getSupabase, isSupabaseConfigured } from '@/lib/supabaseClient'
import { isSupabaseOwnerId } from '@/lib/searchQuotaApi'
import { loadAuthSession } from '@/data/authSession'
import {
  loadWatchlist,
  sortWatchlist,
  type WatchlistItem,
  WATCHLIST_STORAGE_KEY,
} from '@/data/watchlistStorage'
import {
  NOTES_STORAGE_KEY,
  type SavedNote,
} from '@/data/propertyNotesStorage'
import { writeScopedItem, readScopedItem, currentOwnerId } from '@/data/ownerScope'

function canSyncRemote() {
  const session = loadAuthSession()
  return isSupabaseConfigured() && isSupabaseOwnerId(session?.userId)
}

type DiligenceRow = {
  property_id: string
  address: string
  city: string
  state: string
  zip_code: string
  bedrooms: number
  bathrooms: number
  sqft: number
  starred_at: string
  visited_at: string | null
  planned_visit_at: string | null
  reminder_enabled: boolean
}

type NoteRow = {
  note_id: string
  property_id: string
  body: string
  created_at: string
}

function rowToItem(row: DiligenceRow): WatchlistItem {
  return {
    id: row.property_id,
    address: row.address,
    city: row.city,
    state: row.state,
    zipCode: row.zip_code ?? '',
    bedrooms: Number(row.bedrooms ?? 0),
    bathrooms: Number(row.bathrooms ?? 0),
    sqft: Number(row.sqft ?? 0),
    starredAt: row.starred_at,
    visitedAt: row.visited_at,
    plannedVisitAt: row.planned_visit_at,
    reminderEnabled: Boolean(row.reminder_enabled),
  }
}

function itemToRow(userId: string, item: WatchlistItem): DiligenceRow & { user_id: string } {
  return {
    user_id: userId,
    property_id: item.id,
    address: item.address,
    city: item.city,
    state: item.state,
    zip_code: item.zipCode,
    bedrooms: item.bedrooms,
    bathrooms: item.bathrooms,
    sqft: item.sqft,
    starred_at: item.starredAt,
    visited_at: item.visitedAt ?? null,
    planned_visit_at: item.plannedVisitAt ?? null,
    reminder_enabled: Boolean(item.reminderEnabled),
  }
}

function persistLocalWatchlist(items: WatchlistItem[]) {
  writeScopedItem(WATCHLIST_STORAGE_KEY, JSON.stringify(items), currentOwnerId())
}

function loadLocalNotesMap(): Record<string, SavedNote[]> {
  try {
    const raw = readScopedItem(NOTES_STORAGE_KEY, currentOwnerId())
    if (!raw) return {}
    const all = JSON.parse(raw) as Record<string, SavedNote[]>
    return all && typeof all === 'object' ? all : {}
  } catch {
    return {}
  }
}

function persistLocalNotesMap(all: Record<string, SavedNote[]>) {
  writeScopedItem(NOTES_STORAGE_KEY, JSON.stringify(all), currentOwnerId())
}

/** Pull remote diligence into local cache. Returns merged watchlist. */
export async function pullDiligenceFromCloud(): Promise<WatchlistItem[]> {
  if (!canSyncRemote()) return loadWatchlist()

  const supabase = getSupabase()
  const userId = loadAuthSession()?.userId
  if (!supabase || !userId) return loadWatchlist()

  await supabase.rpc('ensure_profile')

  const [{ data: homes, error: homesError }, { data: notes, error: notesError }] =
    await Promise.all([
      supabase.from('diligence_homes').select('*').eq('user_id', userId),
      supabase.from('property_notes').select('*').eq('user_id', userId),
    ])

  if (homesError) {
    console.warn('pull diligence_homes failed', homesError.message)
    return loadWatchlist()
  }
  if (notesError) {
    console.warn('pull property_notes failed', notesError.message)
  }

  const remoteItems = sortWatchlist(((homes ?? []) as DiligenceRow[]).map(rowToItem))
  const localItems = loadWatchlist()

  // First cloud pull empty + local has data → upload local (claim device work)
  if (remoteItems.length === 0 && localItems.length > 0) {
    await pushWatchlistToCloud(localItems)
    return localItems
  }

  persistLocalWatchlist(remoteItems)

  if (!notesError) {
    const map: Record<string, SavedNote[]> = {}
    for (const row of (notes ?? []) as NoteRow[]) {
      const list = map[row.property_id] ?? []
      list.push({
        id: row.note_id,
        text: row.body,
        createdAt: row.created_at,
      })
      map[row.property_id] = list
    }
    for (const key of Object.keys(map)) {
      map[key] = map[key]!.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
    }

    // If remote notes empty but local has some, push local
    const localMap = loadLocalNotesMap()
    const remoteNoteCount = Object.values(map).reduce((n, list) => n + list.length, 0)
    const localNoteCount = Object.values(localMap).reduce((n, list) => n + list.length, 0)
    if (remoteNoteCount === 0 && localNoteCount > 0) {
      await pushAllNotesToCloud(localMap)
    } else {
      persistLocalNotesMap(map)
    }
  }

  return remoteItems
}

export async function pushWatchlistToCloud(items: WatchlistItem[]) {
  if (!canSyncRemote()) return
  const supabase = getSupabase()
  const userId = loadAuthSession()?.userId
  if (!supabase || !userId) return

  const rows = items.map((item) => ({
    ...itemToRow(userId, item),
    updated_at: new Date().toISOString(),
  }))

  // Replace set: upsert current, delete removed
  const { error: upsertError } = await supabase.from('diligence_homes').upsert(rows, {
    onConflict: 'user_id,property_id',
  })
  if (upsertError) {
    console.warn('upsert diligence_homes failed', upsertError.message)
    return
  }

  const keepIds = new Set(items.map((item) => item.id))
  const { data: existing } = await supabase
    .from('diligence_homes')
    .select('property_id')
    .eq('user_id', userId)

  const toDelete = ((existing ?? []) as { property_id: string }[])
    .map((row) => row.property_id)
    .filter((id) => !keepIds.has(id))

  if (toDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('diligence_homes')
      .delete()
      .eq('user_id', userId)
      .in('property_id', toDelete)
    if (deleteError) console.warn('delete diligence_homes failed', deleteError.message)
  }
}

async function pushAllNotesToCloud(all: Record<string, SavedNote[]>) {
  if (!canSyncRemote()) return
  const supabase = getSupabase()
  const userId = loadAuthSession()?.userId
  if (!supabase || !userId) return

  const rows: Array<{
    user_id: string
    note_id: string
    property_id: string
    body: string
    created_at: string
  }> = []

  for (const [propertyId, notes] of Object.entries(all)) {
    for (const note of notes) {
      rows.push({
        user_id: userId,
        note_id: note.id,
        property_id: propertyId,
        body: note.text,
        created_at: note.createdAt,
      })
    }
  }

  if (rows.length === 0) return
  const { error } = await supabase.from('property_notes').upsert(rows, {
    onConflict: 'user_id,note_id',
  })
  if (error) console.warn('upsert property_notes failed', error.message)
}

export async function syncWatchlistAfterLocalChange(items: WatchlistItem[]) {
  void pushWatchlistToCloud(items)
}

export async function syncNotesAfterLocalChange(propertyId: string, notes: SavedNote[]) {
  if (!canSyncRemote()) return
  const supabase = getSupabase()
  const userId = loadAuthSession()?.userId
  if (!supabase || !userId) return

  const rows = notes.map((note) => ({
    user_id: userId,
    note_id: note.id,
    property_id: propertyId,
    body: note.text,
    created_at: note.createdAt,
  }))

  // Delete removed notes for this property, upsert current
  const { data: existing } = await supabase
    .from('property_notes')
    .select('note_id')
    .eq('user_id', userId)
    .eq('property_id', propertyId)

  const keep = new Set(notes.map((note) => note.id))
  const toDelete = ((existing ?? []) as { note_id: string }[])
    .map((row) => row.note_id)
    .filter((id) => !keep.has(id))

  if (toDelete.length > 0) {
    await supabase
      .from('property_notes')
      .delete()
      .eq('user_id', userId)
      .in('note_id', toDelete)
  }

  if (rows.length > 0) {
    const { error } = await supabase.from('property_notes').upsert(rows, {
      onConflict: 'user_id,note_id',
    })
    if (error) console.warn('sync notes failed', error.message)
  }
}
