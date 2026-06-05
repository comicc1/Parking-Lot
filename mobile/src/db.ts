import * as SQLite from 'expo-sqlite'

import type { Note, NoteDraft } from './types'

const DATABASE_NAME = 'parking-lot.db'

type NoteRow = {
  id: number
  title: string
  content: string
  created_at: number
  updated_at: number
}

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null

async function getDatabase() {
  if (!databasePromise) {
    databasePromise = (async () => {
      const database = await SQLite.openDatabaseAsync(DATABASE_NAME)

      await database.execAsync(`
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;
        CREATE TABLE IF NOT EXISTS notes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
      `)

      return database
    })()
  }

  return databasePromise
}

function rowToNote(row: NoteRow): Note {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function fetchNotes() {
  const database = await getDatabase()
  const rows = await database.getAllAsync<NoteRow>(
    'SELECT id, title, content, created_at, updated_at FROM notes ORDER BY updated_at DESC, id DESC',
  )

  return rows.map(rowToNote)
}

export async function saveNote(draft: NoteDraft) {
  const database = await getDatabase()
  const now = Date.now()
  const title = draft.title.trim()
  const content = draft.content.trim()

  if (!title && !content && draft.id === 0) {
    return null
  }

  if (draft.id > 0) {
    await database.runAsync(
      `UPDATE notes
       SET title = ?, content = ?, updated_at = ?
       WHERE id = ?`,
      title || 'Untitled',
      draft.content,
      now,
      draft.id,
    )

    return getNoteById(draft.id)
  }

  const result = await database.runAsync(
    `INSERT INTO notes (title, content, created_at, updated_at)
     VALUES (?, ?, ?, ?)`,
    title || 'Untitled',
    draft.content,
    now,
    now,
  )

  return getNoteById(Number(result.lastInsertRowId))
}

export async function deleteNote(id: number) {
  const database = await getDatabase()
  await database.runAsync('DELETE FROM notes WHERE id = ?', id)
}

export async function getNoteById(id: number) {
  const database = await getDatabase()
  const row = await database.getFirstAsync<NoteRow>(
    'SELECT id, title, content, created_at, updated_at FROM notes WHERE id = ?',
    id,
  )

  return row ? rowToNote(row) : null
}
