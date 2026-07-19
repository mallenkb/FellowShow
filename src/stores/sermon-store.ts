import { create } from "zustand"
import { load, type Store } from "@tauri-apps/plugin-store"
import { sanitizeAnnouncementDocument } from "@/lib/announcements"
import type {
  AnnouncementDocument,
  PreachingSummary,
  SermonNote,
  SermonSession,
} from "@/types"

interface SermonState {
  sessions: SermonSession[]
  activeSessionId: string | null
  selectedSessionId: string | null
  startSession: (transcriptStartIndex: number) => string
  completeSession: (
    id: string,
    summary: PreachingSummary | null,
    transcript: string[]
  ) => void
  setFinalSummary: (
    id: string,
    summary: PreachingSummary,
    document: AnnouncementDocument
  ) => void
  setSummaryDocument: (id: string, document: AnnouncementDocument) => void
  setSummaryTitle: (id: string, title: string) => void
  updateSessionTitle: (id: string, title: string) => void
  setNoteTickerMessage: (
    sessionId: string,
    noteIds: string[],
    tickerMessageId: string
  ) => void
  addNotes: (
    id: string,
    notes: string[],
    throughSegmentIndex: number,
    source?: SermonNote["source"]
  ) => void
  updateNote: (sessionId: string, noteId: string, text: string) => void
  toggleQueuedNote: (sessionId: string, noteId: string) => void
  clearQueue: (sessionId: string) => void
  selectSession: (id: string) => void
}

const STORE_FILE = "sermon-sessions.json"
const STORE_KEY = "sessions"
const MAX_SESSIONS = 50
let sermonStore: Store | null = null
let hydrationPromise: Promise<void> | null = null
let saveTimer: ReturnType<typeof setTimeout> | null = null
let pendingPersist: Promise<void> = Promise.resolve()

function defaultTitle() {
  return "Sermon"
}

function sanitizeSessionTitle(value: unknown, startedAt: number) {
  if (typeof value !== "string" || !value.trim()) return defaultTitle()
  const title = value.trim()
  const looksAutomaticallyGenerated =
    title.startsWith("Sermon –") &&
    title.includes(String(new Date(startedAt).getFullYear())) &&
    title.includes(":")
  return looksAutomaticallyGenerated ? defaultTitle() : title
}

function sanitizeSummary(value: unknown): PreachingSummary | null {
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  if (typeof record.overview !== "string") return null
  return {
    overview: record.overview,
    key_points: Array.isArray(record.key_points)
      ? record.key_points.filter(
          (point): point is string => typeof point === "string"
        )
      : [],
    scriptures: Array.isArray(record.scriptures)
      ? record.scriptures.filter(
          (scripture): scripture is string => typeof scripture === "string"
        )
      : [],
  }
}

function sanitizeSessions(value: unknown): SermonSession[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is Record<string, unknown> =>
      Boolean(item && typeof item === "object")
    )
    .map((item) => {
      const startedAt =
        typeof item.startedAt === "number" ? item.startedAt : Date.now()
      const notes = Array.isArray(item.notes)
        ? item.notes
            .filter((note): note is Record<string, unknown> =>
              Boolean(
                note &&
                typeof note === "object" &&
                typeof (note as Record<string, unknown>).text === "string"
              )
            )
            .map((note) => ({
              id: typeof note.id === "string" ? note.id : crypto.randomUUID(),
              text: String(note.text).trim(),
              createdAt:
                typeof note.createdAt === "number" ? note.createdAt : startedAt,
              source:
                note.source === "final"
                  ? ("final" as const)
                  : ("live" as const),
              ...(typeof note.tickerMessageId === "string"
                ? { tickerMessageId: note.tickerMessageId }
                : {}),
            }))
            .filter((note) => note.text)
        : []
      const noteIds = new Set(notes.map((note) => note.id))
      return {
        id: typeof item.id === "string" ? item.id : crypto.randomUUID(),
        title: sanitizeSessionTitle(item.title, startedAt),
        startedAt,
        endedAt: typeof item.endedAt === "number" ? item.endedAt : null,
        transcriptStartIndex:
          typeof item.transcriptStartIndex === "number"
            ? Math.max(0, item.transcriptStartIndex)
            : 0,
        transcript: Array.isArray(item.transcript)
          ? item.transcript.filter(
              (line): line is string => typeof line === "string"
            )
          : [],
        lastNoteSegmentIndex:
          typeof item.lastNoteSegmentIndex === "number"
            ? Math.max(0, item.lastNoteSegmentIndex)
            : 0,
        notes,
        queuedNoteIds: Array.isArray(item.queuedNoteIds)
          ? item.queuedNoteIds.filter(
              (id): id is string => typeof id === "string" && noteIds.has(id)
            )
          : [],
        finalSummary: sanitizeSummary(item.finalSummary),
        summaryTitle:
          typeof item.summaryTitle === "string" && item.summaryTitle.trim()
            ? item.summaryTitle
            : "Preaching Summary",
        summaryDocument:
          item.summaryDocument && typeof item.summaryDocument === "object"
            ? sanitizeAnnouncementDocument(item.summaryDocument)
            : null,
      }
    })
    .slice(-MAX_SESSIONS)
}

async function getStore() {
  sermonStore ??= await load(STORE_FILE, { autoSave: false, defaults: {} })
  return sermonStore
}

async function persist(state: SermonState) {
  try {
    const store = await getStore()
    await store.set("version", 1)
    await store.set(STORE_KEY, state.sessions.slice(-MAX_SESSIONS))
    await store.set("selectedSessionId", state.selectedSessionId)
    await store.save()
  } catch (error) {
    console.warn("[sermon] Failed to save sermon sessions", error)
  }
}

function queuePersist(state: SermonState) {
  pendingPersist = pendingPersist.then(() => persist(state))
  return pendingPersist
}

export const useSermonStore = create<SermonState>((set) => ({
  sessions: [],
  activeSessionId: null,
  selectedSessionId: null,
  startSession: (transcriptStartIndex) => {
    const startedAt = Date.now()
    const id = crypto.randomUUID()
    const session: SermonSession = {
      id,
      title: defaultTitle(),
      startedAt,
      endedAt: null,
      transcriptStartIndex,
      transcript: [],
      lastNoteSegmentIndex: transcriptStartIndex,
      notes: [],
      queuedNoteIds: [],
      finalSummary: null,
      summaryTitle: "Preaching Summary",
      summaryDocument: null,
    }
    set((state) => ({
      sessions: [...state.sessions, session].slice(-MAX_SESSIONS),
      activeSessionId: id,
      selectedSessionId: id,
    }))
    return id
  },
  completeSession: (id, finalSummary, transcript) =>
    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === id
          ? { ...session, endedAt: Date.now(), finalSummary, transcript }
          : session
      ),
      activeSessionId:
        state.activeSessionId === id ? null : state.activeSessionId,
      selectedSessionId: id,
    })),
  setFinalSummary: (id, finalSummary, summaryDocument) =>
    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === id
          ? { ...session, finalSummary, summaryDocument }
          : session
      ),
    })),
  setSummaryDocument: (id, summaryDocument) =>
    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === id ? { ...session, summaryDocument } : session
      ),
    })),
  setSummaryTitle: (id, summaryTitle) =>
    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === id ? { ...session, summaryTitle } : session
      ),
    })),
  updateSessionTitle: (id, title) =>
    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === id ? { ...session, title } : session
      ),
    })),
  setNoteTickerMessage: (sessionId, noteIds, tickerMessageId) =>
    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              notes: session.notes.map((note) =>
                noteIds.includes(note.id) ? { ...note, tickerMessageId } : note
              ),
            }
          : session
      ),
    })),
  addNotes: (id, texts, throughSegmentIndex, source = "live") =>
    set((state) => ({
      sessions: state.sessions.map((session) => {
        if (session.id !== id) return session
        const existing = new Set(
          session.notes.map((note) => note.text.trim().toLowerCase())
        )
        const notes = texts
          .map((text) => text.trim())
          .filter((text) => text && !existing.has(text.toLowerCase()))
          .map((text): SermonNote => ({
            id: crypto.randomUUID(),
            text,
            createdAt: Date.now(),
            source,
          }))
        return {
          ...session,
          notes: [...session.notes, ...notes],
          lastNoteSegmentIndex: Math.max(
            session.lastNoteSegmentIndex,
            throughSegmentIndex
          ),
        }
      }),
    })),
  updateNote: (sessionId, noteId, text) =>
    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              notes: session.notes.map((note) =>
                note.id === noteId ? { ...note, text } : note
              ),
            }
          : session
      ),
    })),
  toggleQueuedNote: (sessionId, noteId) =>
    set((state) => ({
      sessions: state.sessions.map((session) => {
        if (session.id !== sessionId) return session
        const queued = session.queuedNoteIds.includes(noteId)
        return {
          ...session,
          queuedNoteIds: queued
            ? session.queuedNoteIds.filter((id) => id !== noteId)
            : [...session.queuedNoteIds, noteId],
        }
      }),
    })),
  clearQueue: (sessionId) =>
    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === sessionId ? { ...session, queuedNoteIds: [] } : session
      ),
    })),
  selectSession: (selectedSessionId) => set({ selectedSessionId }),
}))

export function hydrateSermonSessions(): Promise<void> {
  if (hydrationPromise) return hydrationPromise
  hydrationPromise = (async () => {
    try {
      const store = await getStore()
      const recoveredAt = Date.now()
      const sessions = sanitizeSessions(
        await store.get<unknown>(STORE_KEY)
      ).map((session) =>
        session.endedAt === null
          ? { ...session, endedAt: recoveredAt }
          : session
      )
      const storedSelected = await store.get<string>("selectedSessionId")
      const selected =
        sessions.find((session) => session.id === storedSelected) ??
        sessions.at(-1) ??
        null
      useSermonStore.setState({
        sessions,
        activeSessionId: null,
        selectedSessionId: selected?.id ?? null,
      })
      useSermonStore.subscribe((state, previous) => {
        if (
          state.sessions === previous.sessions &&
          state.selectedSessionId === previous.selectedSessionId
        ) {
          return
        }
        if (saveTimer) clearTimeout(saveTimer)
        saveTimer = setTimeout(() => {
          saveTimer = null
          void queuePersist(useSermonStore.getState())
        }, 500)
      })
    } catch (error) {
      console.warn("[sermon] Failed to load sermon sessions", error)
    }
  })()
  return hydrationPromise
}

export function flushSermonSessions(): Promise<void> {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  return queuePersist(useSermonStore.getState())
}
