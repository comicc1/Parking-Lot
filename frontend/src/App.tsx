import { useEffect, useState } from 'react'
import './App.css'
import { createNote as createNoteRequest, deleteNote as deleteNoteRequest, fetchNotes, updateNote as updateNoteRequest } from './api'
import type { Note } from './types'

const EMPTY_NOTE: Note = {
  id: 0,
  title: '',
  content: '',
  updatedAt: 0,
  createdAt: 0,
  tags: [],
  pinned: false,
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

function normalizeTitle(value: string) {
  return value.trim().toLowerCase()
}

function excerpt(value: string, maxLength = 160) {
  const clean = value.replace(/\s+/g, ' ').trim()

  if (!clean) {
    return 'Empty note'
  }

  if (clean.length <= maxLength) {
    return clean
  }

  return `${clean.slice(0, maxLength).trimEnd()}...`
}

function splitWikiLinkTarget(value: string) {
  return value.trim()
}

type ContentPart =
  | { type: 'text'; value: string }
  | { type: 'link'; value: string }

function parseWikiContent(content: string): ContentPart[] {
  const parts: ContentPart[] = []
  const pattern = /\[\[([^[\]]+)\]\]/g
  let lastIndex = 0

  for (const match of content.matchAll(pattern)) {
    const start = match.index ?? 0
    const fullMatch = match[0]
    const target = splitWikiLinkTarget(match[1] ?? '')

    if (start > lastIndex) {
      parts.push({ type: 'text', value: content.slice(lastIndex, start) })
    }

    if (target) {
      parts.push({ type: 'link', value: target })
    } else {
      parts.push({ type: 'text', value: fullMatch })
    }

    lastIndex = start + fullMatch.length
  }

  if (lastIndex < content.length) {
    parts.push({ type: 'text', value: content.slice(lastIndex) })
  }

  if (parts.length === 0) {
    parts.push({ type: 'text', value: content })
  }

  return parts
}

function App() {
  const [notes, setNotes] = useState<Note[]>([])
  const [activeNoteId, setActiveNoteId] = useState<number>(0)
  const [draft, setDraft] = useState<Note>(EMPTY_NOTE)
  const [search, setSearch] = useState('')
  const [selectedTag, setSelectedTag] = useState('all')
  const [vaultHidden, setVaultHidden] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editorMode, setEditorMode] = useState<'edit' | 'view'>('edit')

  useEffect(() => {
    let ignore = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const nextNotes = await fetchNotes()

        if (ignore) {
          return
        }

        setNotes(nextNotes)

        if (nextNotes.length > 0) {
          setActiveNoteId(nextNotes[0].id)
          setDraft(nextNotes[0])
        } else {
          setActiveNoteId(0)
          setDraft(EMPTY_NOTE)
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load notes')
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      ignore = true
    }
  }, [])

  const normalizedSearch = search.trim().toLowerCase()

  const filteredNotes = [...notes]
    .filter((note) => {
      const matchesSearch =
        !normalizedSearch ||
        note.title.toLowerCase().includes(normalizedSearch) ||
        note.content.toLowerCase().includes(normalizedSearch) ||
        note.tags.some((tag) => tag.includes(normalizedSearch))

      const matchesTag = selectedTag === 'all' ? true : note.tags.includes(selectedTag)

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
  const noteByTitle = new Map(notes.map((note) => [normalizeTitle(note.title), note]))
  function openNote(note: Note) {
    setActiveNoteId(note.id)
    setDraft(note)
    setError(null)
  }

  function openOrCreateLinkedNote(title: string) {
    const normalizedTitle = normalizeTitle(title)
    const existing = noteByTitle.get(normalizedTitle)

    if (existing) {
      openNote(existing)
      return
    }

    setActiveNoteId(0)
    setDraft({
      ...EMPTY_NOTE,
      title: title.trim(),
      content: '',
    })
    setEditorMode('edit')
    setError(null)
  }

  function renderContentPreview() {
    if (!draft.content.trim()) {
      return (
        <div className="empty-view-state">
          <h3>Nothing here yet</h3>
          <p>Write in edit mode, then open view mode to follow wiki links.</p>
        </div>
      )
    }

    return draft.content.split('\n').map((line, lineIndex) => {
      const lineParts = parseWikiContent(line)

      if (!line.trim()) {
        return <div key={`line-${lineIndex}`} className="content-spacer" />
      }

      return (
        <p key={`line-${lineIndex}`}>
          {lineParts.map((part, partIndex) => {
            if (part.type === 'text') {
              return <span key={`part-${lineIndex}-${partIndex}`}>{part.value}</span>
            }

            const linkedNote = noteByTitle.get(normalizeTitle(part.value))

            return (
              <button
                key={`part-${lineIndex}-${partIndex}`}
                type="button"
                className="wiki-link"
                onClick={() => openOrCreateLinkedNote(part.value)}
              >
                <span>{`[[${part.value}]]`}</span>
                <span className="wiki-link-preview" role="tooltip">
                  <strong>{part.value}</strong>
                  <p>{linkedNote ? excerpt(linkedNote.content) : 'No page yet. Click to create it.'}</p>
                </span>
              </button>
            )
          })}
        </p>
      )
    })
  }

  async function saveDraft(partial?: Partial<Note>) {
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

    setSaving(true)
    setError(null)

    try {
      if (nextDraft.id) {
        const updated = await updateNoteRequest(nextDraft.id, {
          title: nextDraft.title.trim() || 'Untitled',
          content: nextDraft.content,
          tags: nextDraft.tags,
          pinned: nextDraft.pinned,
        })

        setNotes((current) => current.map((note) => (note.id === updated.id ? updated : note)))
        setDraft(updated)
        setActiveNoteId(updated.id)
        return
      }

      const created = await createNoteRequest({
        title: nextDraft.title.trim() || 'Untitled',
        content: nextDraft.content,
        tags: nextDraft.tags,
        pinned: nextDraft.pinned,
      })

      setNotes((current) => [created, ...current])
      setDraft(created)
      setActiveNoteId(created.id)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save note')
    } finally {
      setSaving(false)
    }
  }

  function createDraft() {
    setActiveNoteId(0)
    setDraft({
      ...EMPTY_NOTE,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: selectedTag !== 'all' ? [selectedTag] : [],
    })
    setError(null)
  }

  async function deleteNote() {
    if (!draft.id) {
      setDraft(EMPTY_NOTE)
      return
    }

    setSaving(true)
    setError(null)

    try {
      await deleteNoteRequest(draft.id)
      const remaining = notes.filter((note) => note.id !== draft.id)
      setNotes(remaining)

      if (remaining.length > 0) {
        openNote(remaining[0])
      } else {
        setActiveNoteId(0)
        setDraft(EMPTY_NOTE)
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete note')
    } finally {
      setSaving(false)
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
          <button className="tool-button" onClick={createDraft} title="New note">
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
              <h2>{loading ? 'Loading...' : `${filteredNotes.length} files`}</h2>
            </div>
            <div className="vault-stat">
              <span>{notes.filter((note) => note.pinned).length} pinned</span>
            </div>
          </div>

          {error ? (
            <div className="empty-panel">
              <h3>Connection issue</h3>
              <p>{error}</p>
            </div>
          ) : null}

          <div className="note-list">
            {loading ? (
              <div className="empty-panel">
                <h3>Loading notes</h3>
                <p>Loading your local notes from this browser.</p>
              </div>
            ) : filteredNotes.length ? (
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
                <h3>No notes yet</h3>
                <p>Create your first note to start storing it locally.</p>
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
              <div className="mode-toggle" role="tablist" aria-label="Editor mode">
                <button
                  type="button"
                  className={`ghost-button compact-button ${editorMode === 'edit' ? 'active' : ''}`}
                  onClick={() => setEditorMode('edit')}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className={`ghost-button compact-button ${editorMode === 'view' ? 'active' : ''}`}
                  onClick={() => setEditorMode('view')}
                >
                  View
                </button>
              </div>
              <button
                className="ghost-button"
                onClick={() => setVaultHidden((current) => !current)}
              >
                {vaultHidden ? 'Show vault' : 'Hide vault'}
              </button>
              <button
                className={`ghost-button ${draft.pinned ? 'active' : ''}`}
                onClick={() => void saveDraft({ pinned: !draft.pinned })}
                disabled={saving}
              >
                {draft.pinned ? 'Unpin' : 'Pin'}
              </button>
              <button className="ghost-button" onClick={() => void saveDraft()} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button className="danger-button" onClick={() => void deleteNote()} disabled={saving}>
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
                onBlur={() => void saveDraft()}
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
                onBlur={() => void saveDraft()}
              />
              {editorMode === 'edit' ? (
                <textarea
                  className="content-input"
                  placeholder="Start writing. Supports headings, lists, checkboxes, and [[wiki links]]."
                  value={draft.content}
                  onChange={(event) => setDraft({ ...draft, content: event.target.value })}
                  onBlur={() => void saveDraft()}
                />
              ) : (
                <article className="content-view">{renderContentPreview()}</article>
              )}
            </section>
          </div>
        </main>
      </section>
    </div>
  )
}

export default App
