import { useEffect, useState } from 'react'
import './App.css'
import type { Note } from './types'

const STORAGE_KEY = 'parking-lot-local-notes'

const STARTER_NOTES: Note[] = [
  {
    id: 1,
    title: 'Sprint check-in',
    content:
      '# Today\n\n- Build local-first notes experience\n- Match an Obsidian-style workspace\n- Keep backend optional for now\n\n## Update\nThe prototype is saving notes in localStorage and is ready for frontend demo review.',
    updatedAt: Date.now() - 1000 * 60 * 14,
    createdAt: Date.now() - 1000 * 60 * 60,
    tags: ['work', 'update'],
    pinned: true,
  },
  {
    id: 2,
    title: 'Ideas vault',
    content:
      '## Note directions\n\nUse this space for rough ideas, meeting notes, and quick capture.\n\n[[Local vault]]\n[[Daily note]]',
    updatedAt: Date.now() - 1000 * 60 * 90,
    createdAt: Date.now() - 1000 * 60 * 120,
    tags: ['ideas'],
    pinned: false,
  },
]

const EMPTY_NOTE: Note = {
  id: 0,
  title: '',
  content: '',
  updatedAt: 0,
  createdAt: 0,
  tags: [],
  pinned: false,
}

function loadInitialNotes() {
  const saved = localStorage.getItem(STORAGE_KEY)
  return saved ? (JSON.parse(saved) as Note[]) : STARTER_NOTES
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(timestamp)
}

function parseTags(value: string) {
  return value
    .split(',')
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean)
    .filter((tag, index, arr) => arr.indexOf(tag) === index)
}

function App() {
  const [notes, setNotes] = useState<Note[]>(loadInitialNotes)
  const [activeNoteId, setActiveNoteId] = useState<number>(() => loadInitialNotes()[0]?.id ?? 0)
  const [draft, setDraft] = useState<Note>(() => loadInitialNotes()[0] ?? EMPTY_NOTE)
  const [search, setSearch] = useState('')
  const [selectedTag, setSelectedTag] = useState('all')
  const [vaultHidden, setVaultHidden] = useState(false)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
  }, [notes])

  const normalizedSearch = search.trim().toLowerCase()

  const filteredNotes = [...notes]
    .filter((note) => {
      const matchesSearch =
        !normalizedSearch ||
        note.title.toLowerCase().includes(normalizedSearch) ||
        note.content.toLowerCase().includes(normalizedSearch) ||
        note.tags.some((tag) => tag.includes(normalizedSearch))

      const matchesTag =
        selectedTag === 'all' ? true : note.tags.includes(selectedTag)

      return matchesSearch && matchesTag
    })
    .sort((a, b) => {
      if (a.pinned !== b.pinned) {
        return a.pinned ? -1 : 1
      }
      return b.updatedAt - a.updatedAt
    })

  const allTags = Array.from(new Set(notes.flatMap((note) => note.tags))).sort()
  const activeNote = notes.find((note) => note.id === activeNoteId)
  const wordCount = draft.content.trim() ? draft.content.trim().split(/\s+/).length : 0
  const charCount = draft.content.length

  function openNote(note: Note) {
    setActiveNoteId(note.id)
    setDraft(note)
  }

  function saveDraft(partial?: Partial<Note>) {
    const nextDraft = {
      ...draft,
      ...partial,
      title: (partial?.title ?? draft.title).trimStart(),
      content: partial?.content ?? draft.content,
      tags: partial?.tags ?? draft.tags,
      pinned: partial?.pinned ?? draft.pinned,
    }

    if (!nextDraft.title.trim() && !nextDraft.content.trim()) {
      return
    }

    if (nextDraft.id) {
      const updated: Note = {
        ...nextDraft,
        title: nextDraft.title.trim() || 'Untitled',
        updatedAt: Date.now(),
      }

      setNotes((current) =>
        current.map((note) => (note.id === updated.id ? updated : note)),
      )
      setDraft(updated)
      return
    }

    const created: Note = {
      ...nextDraft,
      id: Date.now(),
      title: nextDraft.title.trim() || 'Untitled',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    setNotes((current) => [created, ...current])
    openNote(created)
  }

  function createNote() {
    const fresh: Note = {
      ...EMPTY_NOTE,
      id: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: selectedTag !== 'all' ? [selectedTag] : [],
    }

    setActiveNoteId(0)
    setDraft(fresh)
  }

  function deleteNote() {
    if (!draft.id) {
      setDraft(EMPTY_NOTE)
      return
    }

    const remaining = notes.filter((note) => note.id !== draft.id)
    setNotes(remaining)
    if (remaining.length) {
      openNote(remaining[0])
    } else {
      setActiveNoteId(0)
      setDraft(EMPTY_NOTE)
    }
  }

  return (
    <div className="app-shell">
      <aside className="rail">
        <div className="rail-brand">
          <div className="rail-brand-copy">
            <p className="eyebrow">Vault</p>
            <h1>Parking Lot</h1>
          </div>
        </div>

        <div className="vault-toolbar">
          <button className="tool-button" onClick={createNote} title="New note">
            <span>+</span>
          </button>
          <label className="search-panel">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search notes"
            />
          </label>
        </div>

        <section className="rail-section">
          <div className="section-heading">
            <span>Folders</span>
          </div>
          <button
            className={`filter-chip folder-row ${selectedTag === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedTag('all')}
          >
            Notes
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              className={`filter-chip folder-row ${selectedTag === tag ? 'active' : ''}`}
              onClick={() => setSelectedTag(tag)}
            >
              {tag}
            </button>
          ))}
        </section>
      </aside>

      <section className="workspace">
        <div className={`notes-pane ${vaultHidden ? 'hidden' : ''}`}>
          <div className="pane-header">
            <div>
              <p className="eyebrow">Notes</p>
              <h2>{filteredNotes.length} files</h2>
            </div>
            <div className="vault-stat">
              <span>{notes.filter((note) => note.pinned).length} pinned</span>
            </div>
          </div>

          <div className="note-list">
            {filteredNotes.length ? (
              filteredNotes.map((note) => (
                <button
                  key={note.id}
                  className={`note-card ${note.id === activeNoteId ? 'active' : ''}`}
                  onClick={() => openNote(note)}
                >
                  <div className="note-card-top">
                    <strong>{note.title}</strong>
                  </div>
                  <div className="note-card-bottom">
                    <span>{formatDate(note.updatedAt)}</span>
                    {note.pinned ? <span className="pin-badge">Pinned</span> : null}
                  </div>
                </button>
              ))
            ) : (
              <div className="empty-panel">
                <h3>No notes match</h3>
                <p>Try a different search or create a new note.</p>
              </div>
            )}
          </div>
        </div>

        <main className="editor-pane">
          <div className="editor-toolbar">
            <div>
              <p className="eyebrow">Editor</p>
              <h2>{activeNote ? 'Active note' : 'Untitled draft'}</h2>
            </div>
            <div className="toolbar-actions">
              <button
                className="ghost-button"
                onClick={() => setVaultHidden((current) => !current)}
              >
                {vaultHidden ? 'Show vault' : 'Hide vault'}
              </button>
              <button
                className={`ghost-button ${draft.pinned ? 'active' : ''}`}
                onClick={() => saveDraft({ pinned: !draft.pinned })}
              >
                {draft.pinned ? 'Unpin' : 'Pin'}
              </button>
              <button className="ghost-button" onClick={() => saveDraft()}>
                Save
              </button>
              <button className="danger-button" onClick={deleteNote}>
                Delete
              </button>
            </div>
          </div>

          <div className="meta-bar">
            <label>
              Tags
              <input
                value={draft.tags.join(', ')}
                onChange={(event) => setDraft({ ...draft, tags: parseTags(event.target.value) })}
                onBlur={() => saveDraft()}
                placeholder="work, ideas, personal"
              />
            </label>
            <div className="meta-stats">
              <span>{wordCount} words</span>
              <span>{charCount} chars</span>
              {draft.updatedAt ? <span>Updated {formatDate(draft.updatedAt)}</span> : null}
            </div>
          </div>

          <div className="editor-grid">
            <section className="editor-panel editor-panel-full">
              <input
                className="title-input"
                placeholder="Untitled"
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                onBlur={() => saveDraft()}
              />
              <textarea
                className="content-input"
                placeholder="Start writing. Supports headings, lists, checkboxes, and [[wiki links]]."
                value={draft.content}
                onChange={(event) => setDraft({ ...draft, content: event.target.value })}
                onBlur={() => saveDraft()}
              />
            </section>
          </div>
        </main>
      </section>
    </div>
  )
}

export default App
