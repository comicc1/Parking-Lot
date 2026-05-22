import type { Note } from './types'

const STORAGE_KEY = 'parking-lot-notes'

type NotePayload = Pick<Note, 'title' | 'content' | 'tags' | 'pinned'>

function readNotes(): Note[] {
  const raw = window.localStorage.getItem(STORAGE_KEY)

  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw) as Note[]

    return parsed.sort((a, b) => b.updatedAt - a.updatedAt)
  } catch {
    return []
  }
}

function writeNotes(notes: Note[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
}

function nextId(notes: Note[]) {
  return notes.reduce((maxId, note) => Math.max(maxId, note.id), 0) + 1
}

export async function fetchNotes() {
  return readNotes()
}

export async function createNote(payload: NotePayload) {
  const notes = readNotes()
  const timestamp = Date.now()
  const created: Note = {
    id: nextId(notes),
    title: payload.title,
    content: payload.content,
    tags: payload.tags,
    pinned: payload.pinned,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  writeNotes([created, ...notes])
  return created
}

export async function updateNote(noteId: number, payload: NotePayload) {
  const notes = readNotes()
  const existing = notes.find((note) => note.id === noteId)

  if (!existing) {
    throw new Error('Note not found')
  }

  const updated: Note = {
    ...existing,
    title: payload.title,
    content: payload.content,
    tags: payload.tags,
    pinned: payload.pinned,
    updatedAt: Date.now(),
  }

  writeNotes(
    notes
      .map((note) => (note.id === noteId ? updated : note))
      .sort((a, b) => b.updatedAt - a.updatedAt),
  )

  return updated
}

export async function deleteNote(noteId: number) {
  const notes = readNotes()
  writeNotes(notes.filter((note) => note.id !== noteId))
}
