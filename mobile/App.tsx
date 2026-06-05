import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'

import { deleteNote, fetchNotes, saveNote } from './src/db'
import type { Note, NoteDraft } from './src/types'

const EMPTY_DRAFT: NoteDraft = {
  id: 0,
  title: '',
  content: '',
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(timestamp)
}

function excerpt(value: string, maxLength = 120) {
  const clean = value.replace(/\s+/g, ' ').trim()

  if (!clean) {
    return 'Empty note'
  }

  if (clean.length <= maxLength) {
    return clean
  }

  return `${clean.slice(0, maxLength).trimEnd()}...`
}

export default function App() {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editorVisible, setEditorVisible] = useState(false)
  const [draft, setDraft] = useState<NoteDraft>(EMPTY_DRAFT)
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const nextNotes = await fetchNotes()

        if (!cancelled) {
          setNotes(nextNotes)
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load notes')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  const activeNote = useMemo(() => notes.find((note) => note.id === draft.id) ?? null, [draft.id, notes])

  const filteredNotes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return notes
    return notes.filter((note) => [note.title, note.content].join(' ').toLowerCase().includes(query))
  }, [notes, searchQuery])

  function openDraft(nextDraft: NoteDraft) {
    setDraft(nextDraft)
    setEditorVisible(true)
    setError(null)
  }

  function createNote() {
    openDraft(EMPTY_DRAFT)
  }

  function openNote(note: Note) {
    setSelectedNote(note)
  }

  async function persistDraft(nextDraft = draft) {
    if (!nextDraft.title.trim() && !nextDraft.content.trim() && nextDraft.id === 0) {
      setEditorVisible(false)
      setDraft(EMPTY_DRAFT)
      return
    }

    setSaving(true)
    setError(null)

    try {
      const saved = await saveNote(nextDraft)

      if (!saved) return

      setNotes((current) =>
        [saved, ...current.filter((note) => note.id !== saved.id)].sort((a, b) => b.updatedAt - a.updatedAt),
      )

      setDraft({
        id: saved.id,
        title: saved.title,
        content: saved.content,
      })
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save note')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!draft.id) {
      setEditorVisible(false)
      setDraft(EMPTY_DRAFT)
      return
    }

    Alert.alert('Delete note?', 'This will remove the note from the device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setSaving(true)
          setError(null)

          try {
            await deleteNote(draft.id)
            setNotes((current) => current.filter((note) => note.id !== draft.id))
            setEditorVisible(false)
            setDraft(EMPTY_DRAFT)
          } catch (deleteError) {
            setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete note')
          } finally {
            setSaving(false)
          }
        },
      },
    ])
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      {selectedNote ? (
        <View style={styles.detailScreen}>
          <View style={styles.detailTopBar}>
            <Pressable style={styles.backButton} hitSlop={12} onPress={() => setSelectedNote(null)}>
              <Text style={styles.backButtonText}>◁</Text>
            </Pressable>
            <View style={styles.detailActions}>
              <Pressable style={styles.detailMenuButton} onPress={() => openDraft(selectedNote)}>
                <Text style={styles.detailMenuText}>Done</Text>
              </Pressable>
              <Pressable style={styles.detailMenuButton} onPress={() => setSelectedNote(null)}>
                <Text style={styles.detailMenuText}>⋮</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.detailMetaWrap}>
            <Text style={styles.detailTitle}>{selectedNote.title || 'Untitled note'}</Text>
            <Text style={styles.detailMeta}>{formatDate(selectedNote.updatedAt)}</Text>
          </View>

          <View style={styles.detailCard}>
            <Text style={styles.detailBody}>
              {selectedNote.content.trim() ? selectedNote.content : 'No content yet.'}
            </Text>
          </View>

          <Pressable
            style={styles.detailEditButton}
            onPress={() =>
              openDraft({
                id: selectedNote.id,
                title: selectedNote.title,
                content: selectedNote.content,
              })
            }
          >
            <Text style={styles.detailEditText}>Edit note</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.screen}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerIcon}>▤</Text>
              <Text style={styles.headerTitle}>Notes</Text>
            </View>
            <Pressable style={styles.headerMenuButton} onPress={() => setSearchQuery('')}>
              <Text style={styles.headerMenuText}>⋮</Text>
            </Pressable>
          </View>

          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>⌕</Text>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search"
              placeholderTextColor="#8b8b90"
            />
          </View>

          {error ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>Something went wrong</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Loading...</Text>
              <Text style={styles.emptyText}>Getting your notes ready.</Text>
            </View>
          ) : (
            <FlatList
              style={styles.list}
              data={filteredNotes}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={filteredNotes.length ? styles.noteList : styles.noteListEmpty}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <Pressable style={styles.noteCard} onPress={() => openNote(item)}>
                  <View style={styles.noteTopRow}>
                    <Text style={styles.noteTitle}>{item.title || 'Untitled'}</Text>
                    <Text style={styles.noteChevron}>›</Text>
                  </View>
                  <Text style={styles.noteExcerpt}>{excerpt(item.content)}</Text>
                  <Text style={styles.noteMeta}>{formatDate(item.updatedAt)}</Text>
                </Pressable>
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>{searchQuery.trim() ? 'No matching notes' : 'No notes yet'}</Text>
                  <Text style={styles.emptyText}>
                    {searchQuery.trim() ? 'Try a different search.' : 'Create your first note to start.'}
                  </Text>
                </View>
              }
            />
          )}

          <Pressable style={styles.fab} onPress={createNote}>
            <Text style={styles.fabText}>+</Text>
          </Pressable>
        </View>
      )}

      <Modal visible={editorVisible} animationType="slide" transparent onRequestClose={() => setEditorVisible(false)}>
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Pressable style={styles.backButton} onPress={() => setEditorVisible(false)}>
                <Text style={styles.backButtonText}>◁</Text>
              </Pressable>
              <Text style={styles.sheetDone}>{saving ? 'Saving...' : 'Done'}</Text>
              <Pressable style={styles.sheetMenuButton} onPress={() => void persistDraft()}>
                <Text style={styles.sheetMenuText}>⋮</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">
              <View style={styles.inputBlock}>
                <Text style={styles.inputLabel}>Title</Text>
                <TextInput
                  style={styles.titleInput}
                  value={draft.title}
                  onChangeText={(value) => setDraft((current) => ({ ...current, title: value }))}
                  onBlur={() => void persistDraft()}
                  placeholder="Title"
                  placeholderTextColor="#7b7b80"
                />
              </View>

              <View style={styles.inputBlock}>
                <Text style={styles.inputLabel}>Note</Text>
                <TextInput
                  style={styles.contentInput}
                  value={draft.content}
                  onChangeText={(value) => setDraft((current) => ({ ...current, content: value }))}
                  onBlur={() => void persistDraft()}
                  multiline
                  textAlignVertical="top"
                  placeholder="Take a note..."
                  placeholderTextColor="#7b7b80"
                />
              </View>
            </ScrollView>

            <View style={styles.sheetFooter}>
              <Pressable
                style={[styles.footerButton, styles.deleteButton]}
                onPress={() => void handleDelete()}
                disabled={saving}
              >
                <Text style={styles.deleteText}>Delete</Text>
              </Pressable>
              <Pressable
                style={[styles.footerButton, styles.saveButton]}
                onPress={async () => {
                  await persistDraft()
                  setEditorVisible(false)
                }}
                disabled={saving}
              >
                <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save'}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#111111',
  },
  screen: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 12,
    backgroundColor: '#111111',
    position: 'relative',
  },
  detailScreen: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 12,
    backgroundColor: '#111111',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIcon: {
    color: '#dcdcdc',
    fontSize: 17,
  },
  headerTitle: {
    color: '#c7f5d5',
    fontSize: 20,
    fontWeight: '700',
  },
  headerMenuButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerMenuText: {
    color: '#dcdcdc',
    fontSize: 22,
    lineHeight: 22,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2a2a2c',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  searchIcon: {
    color: '#8b8b90',
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    color: '#f4f4f4',
    fontSize: 15,
    padding: 0,
  },
  errorCard: {
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
    borderColor: 'rgba(255, 59, 48, 0.22)',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  errorTitle: {
    color: '#f4f4f4',
    fontWeight: '700',
    marginBottom: 4,
  },
  errorText: {
    color: '#d9d9dc',
  },
  list: {
    flex: 1,
  },
  noteList: {
    gap: 10,
    paddingBottom: 104,
  },
  noteListEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 104,
  },
  noteCard: {
    backgroundColor: '#1a1a1c',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 6,
  },
  noteTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  noteTitle: {
    color: '#f7f7f7',
    fontSize: 16,
    fontWeight: '700',
    flexShrink: 1,
  },
  noteChevron: {
    color: '#f45d7a',
    fontSize: 20,
    lineHeight: 20,
    fontWeight: '700',
  },
  noteExcerpt: {
    color: '#d0d0d3',
    lineHeight: 20,
  },
  noteMeta: {
    color: '#8b8b90',
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    color: '#f4f4f4',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyText: {
    color: '#bdbdc2',
    textAlign: 'center',
    maxWidth: 280,
  },
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 24,
    width: 54,
    height: 54,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2cc5a2',
    elevation: 8,
  },
  fabText: {
    color: '#08110f',
    fontSize: 30,
    lineHeight: 30,
    fontWeight: '700',
    marginTop: -2,
  },
  detailTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1f1f21',
  },
  backButtonText: {
    color: '#f7f7f7',
    fontSize: 20,
    lineHeight: 20,
    fontWeight: '700',
  },
  detailActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailMenuButton: {
    minWidth: 56,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1f1f21',
    paddingHorizontal: 12,
  },
  detailMenuText: {
    color: '#d9d9dc',
    fontSize: 16,
    fontWeight: '700',
  },
  detailMetaWrap: {
    gap: 5,
  },
  detailTitle: {
    color: '#f7f7f7',
    fontSize: 26,
    fontWeight: '700',
  },
  detailMeta: {
    color: '#8b8b90',
    fontSize: 12,
  },
  detailCard: {
    flex: 1,
    backgroundColor: '#1a1a1c',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  detailBody: {
    color: '#f1f1f1',
    fontSize: 16,
    lineHeight: 24,
  },
  detailEditButton: {
    backgroundColor: '#2cc5a2',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  detailEditText: {
    color: '#08110f',
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  sheet: {
    maxHeight: '92%',
    backgroundColor: '#111111',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 56,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#3a3a3d',
    marginBottom: 10,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  sheetDone: {
    color: '#d0d0d3',
    fontSize: 16,
    fontWeight: '700',
  },
  sheetMenuButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1f1f21',
  },
  sheetMenuText: {
    color: '#d9d9dc',
    fontSize: 18,
    fontWeight: '700',
  },
  sheetContent: {
    paddingHorizontal: 16,
    paddingBottom: 18,
    gap: 16,
  },
  inputBlock: {
    gap: 8,
  },
  inputLabel: {
    color: '#d0d0d3',
    fontSize: 14,
    fontWeight: '700',
  },
  titleInput: {
    color: '#f7f7f7',
    fontSize: 22,
    fontWeight: '700',
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: '#2b2b2d',
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  contentInput: {
    minHeight: 260,
    color: '#f1f1f1',
    backgroundColor: 'transparent',
    paddingVertical: 8,
    paddingHorizontal: 2,
    lineHeight: 24,
    fontSize: 16,
  },
  sheetFooter: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 18,
  },
  footerButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#1f1f21',
  },
  saveButton: {
    backgroundColor: '#2cc5a2',
  },
  deleteText: {
    color: '#f4f4f4',
    fontWeight: '700',
  },
  saveText: {
    color: '#08110f',
    fontWeight: '700',
  },
})
