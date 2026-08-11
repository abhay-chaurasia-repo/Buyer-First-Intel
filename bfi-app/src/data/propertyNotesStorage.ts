/** Private property notes — shared by Watchlist (primary) and any other surfaces. */

import { readScopedItem, writeScopedItem } from './ownerScope'

export const NOTES_STORAGE_KEY = 'bfi.property-notes'

export type SavedNote = {
  id: string
  text: string
  createdAt: string
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
  } catch {
    // Ignore storage failures in demo shell
  }
}

export function addNote(propertyKey: string, text: string): SavedNote[] {
  const trimmed = text.trim()
  if (!trimmed) return loadNotes(propertyKey)
  const next: SavedNote[] = [
    {
      id: `note-${Date.now()}`,
      text: trimmed,
      createdAt: new Date().toISOString(),
    },
    ...loadNotes(propertyKey),
  ]
  persistNotes(propertyKey, next)
  return next
}

export function deleteNote(propertyKey: string, noteId: string): SavedNote[] {
  const next = loadNotes(propertyKey).filter((note) => note.id !== noteId)
  persistNotes(propertyKey, next)
  return next
}

export function notesCount(propertyKey: string) {
  return loadNotes(propertyKey).length
}
