/** Private property notes — one re-editable pad per home (not a row log). */

import { readScopedItem, writeScopedItem } from './ownerScope'

export const NOTES_STORAGE_KEY = 'bfi.property-notes'

export type SavedNote = {
  id: string
  text: string
  createdAt: string
  updatedAt?: string
}

export function loadNotes(propertyKey: string): SavedNote[] {
  try {
    const raw = readScopedItem(NOTES_STORAGE_KEY)
    if (!raw) return []
    const all = JSON.parse(raw) as Record<string, SavedNote[]>
    return Array.isArray(all[propertyKey]) ? all[propertyKey]! : []
  } catch {
    return []
  }
}

export function persistNotes(propertyKey: string, notes: SavedNote[]) {
  try {
    const raw = readScopedItem(NOTES_STORAGE_KEY)
    const all = raw ? (JSON.parse(raw) as Record<string, SavedNote[]>) : {}
    all[propertyKey] = notes
    writeScopedItem(NOTES_STORAGE_KEY, JSON.stringify(all))
    void import('@/lib/diligenceSync')
      .then((mod) => mod.syncNotesAfterLocalChange(propertyKey, notes))
      .catch(() => {
        // ignore sync failures
      })
  } catch {
    // Ignore storage failures in demo shell
  }
}

/** Combined pad text for editing (legacy multi-row notes merge into one field). */
export function loadNotePad(propertyKey: string): string {
  const notes = loadNotes(propertyKey)
  if (notes.length === 0) return ''
  if (notes.length === 1) return notes[0]!.text
  return notes
    .map((note) => note.text.trim())
    .filter(Boolean)
    .join('\n\n')
}

/**
 * Save (or clear) the single private note pad for a property.
 * Re-saving updates the same note instead of appending rows.
 */
export function saveNotePad(propertyKey: string, text: string): SavedNote | null {
  const trimmed = text.trim()
  const existing = loadNotes(propertyKey)
  const now = new Date().toISOString()

  if (!trimmed) {
    persistNotes(propertyKey, [])
    return null
  }

  const primary = existing[0]
  const next: SavedNote = {
    id: primary?.id ?? `note-${Date.now()}`,
    text: trimmed,
    createdAt: primary?.createdAt ?? now,
    updatedAt: now,
  }
  persistNotes(propertyKey, [next])
  return next
}

export function addNote(propertyKey: string, text: string): SavedNote[] {
  const saved = saveNotePad(propertyKey, text)
  return saved ? [saved] : []
}

export function updateNote(propertyKey: string, noteId: string, text: string): SavedNote[] {
  const trimmed = text.trim()
  if (!trimmed) {
    return deleteNote(propertyKey, noteId)
  }
  const now = new Date().toISOString()
  const next = loadNotes(propertyKey).map((note) =>
    note.id === noteId ? { ...note, text: trimmed, updatedAt: now } : note,
  )
  persistNotes(propertyKey, next)
  return next
}

export function deleteNote(propertyKey: string, noteId: string): SavedNote[] {
  const next = loadNotes(propertyKey).filter((note) => note.id !== noteId)
  persistNotes(propertyKey, next)
  return next
}

export function notesCount(propertyKey: string) {
  return loadNotePad(propertyKey).trim() ? 1 : 0
}
