import { create } from "zustand"
import { recoverSermon, sanitizeSermonCapture } from "@/lib/sermon-session"
import { useTranscriptStore } from "@/stores/transcript-store"
import { load, type Store } from "@tauri-apps/plugin-store"
import {
  announcementPlainText,
  sanitizeAnnouncementDocument,
} from "@/lib/announcements"
import type {
  AnnouncementDocument,
  PreachingSummary,
  SermonNote,
  SermonSession,
} from "@/types"
import type { SermonNoteDraft } from "@/types/sermon"

interface SermonState {
  sessions: SermonSession[]
  activeSessionId: string | null
  transition: "starting" | "ending" | "pausing" | "deleting" | null
  recoverySessionId: string | null
  saveError: string | null
  pauseSession: (id: string, interrupted?: boolean) => void
  resumeSession: (id: string, transcriptStartIndex: number) => void
  setSummaryDocument: (id: string, document: AnnouncementDocument) => void
  setAiSummaryDraft: (
    id: string,
    document: AnnouncementDocument,
    draft: AnnouncementDocument,
    title: string
  ) => void
  selectedSessionId: string | null
  pendingSummaryDocument: AnnouncementDocument | null
  pendingSummaryTitle: string
  setPendingSummaryDocument: (document: AnnouncementDocument) => void
  setPendingSummaryTitle: (title: string) => void
  startSession: (transcriptStartIndex: number, id?: string) => string
  prepareSession: (title: string, details?: SermonDetails) => string
  updateSessionDetails: (id: string, details: SermonDetails) => void
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
  addGeneratedNotes: (
    id: string,
    drafts: SermonNoteDraft[],
    throughSegmentIndex: number,
    advanceAiCursor?: boolean
  ) => void
  addManualNote: (
    id: string,
    text: string,
    source?: Pick<
      SermonNoteDraft,
      | "sourceContext"
      | "sourceSegmentIds"
      | "sourceSegmentStartIndex"
      | "sourceSegmentEndIndex"
    >
  ) => void
  markNotesProcessed: (id: string, throughSegmentIndex: number) => void
  updateNote: (sessionId: string, noteId: string, text: string) => void
  removeLiveNote: (sessionId: string, noteId: string) => void
  clearLiveNotes: (sessionId: string) => void
  toggleQueuedNote: (sessionId: string, noteId: string) => void
  clearQueue: (sessionId: string) => void
  selectSession: (id: string) => void
}

interface SermonDetails {
  title?: string
  speaker?: string
  series?: string
}

const STORE_FILE = "sermon-sessions.json"
const STORE_KEY = "sessions"
const MAX_SESSIONS = 50
function retainSession(
  session: SermonSession,
  index: number,
  sessions: SermonSession[]
) {
  // History limits must never discard a sermon the operator intends to resume.
  return session.endedAt === null || index >= sessions.length - MAX_SESSIONS
}
let sermonStore: Store | null = null
let hydrationPromise: Promise<void> | null = null
let saveTimer: ReturnType<typeof setTimeout> | null = null
let pendingPersist: Promise<void> = Promise.resolve()
let pendingSummaryRevision = 0
let pendingSummaryTitleRevision = 0

function defaultTitle() {
  return "Sermon"
}

function optionalSessionText(value: unknown): string | undefined {
  return typeof value === "string"
    ? value.trim().slice(0, 120) || undefined
    : undefined
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
        typeof item.startedAt === "number" &&
        Number.isFinite(item.startedAt) &&
        item.startedAt >= 0
          ? item.startedAt
          : Date.now()
      const endedAt =
        typeof item.endedAt === "number" && Number.isFinite(item.endedAt)
          ? item.endedAt
          : null
      const capture = sanitizeSermonCapture(item, startedAt, endedAt)
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
              ...(note.kind === "manual"
                ? { kind: "manual" as const }
                : note.kind === "ai"
                  ? { kind: "ai" as const }
                  : {}),
              ...(typeof note.sourceContext === "string" &&
              note.sourceContext.trim()
                ? { sourceContext: note.sourceContext.trim() }
                : {}),
              ...(Array.isArray(note.sourceSegmentIds)
                ? {
                    sourceSegmentIds: note.sourceSegmentIds.filter(
                      (id): id is string =>
                        typeof id === "string" && Boolean(id)
                    ),
                  }
                : {}),
              ...(typeof note.sourceSegmentStartIndex === "number"
                ? {
                    sourceSegmentStartIndex: Math.max(
                      0,
                      Math.floor(note.sourceSegmentStartIndex)
                    ),
                  }
                : {}),
              ...(typeof note.sourceSegmentEndIndex === "number"
                ? {
                    sourceSegmentEndIndex: Math.max(
                      0,
                      Math.floor(note.sourceSegmentEndIndex)
                    ),
                  }
                : {}),
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
        speaker: optionalSessionText(item.speaker),
        series: optionalSessionText(item.series),
        prepared:
          item.prepared === true &&
          endedAt === null &&
          capture.recordingSpans.length === 0,
        startedAt,
        endedAt,
        ...capture,
        transcriptStartIndex:
          typeof item.transcriptStartIndex === "number"
            ? Math.max(0, item.transcriptStartIndex)
            : 0,
        transcript:
          capture.transcriptSegments.length > 0
            ? capture.transcriptSegments.map((segment) => segment.text)
            : Array.isArray(item.transcript)
              ? item.transcript.filter(
                  (line): line is string => typeof line === "string"
                )
              : [],
        lastNoteSegmentIndex:
          typeof item.lastNoteSegmentIndex === "number"
            ? Math.max(0, item.lastNoteSegmentIndex)
            : 0,
        aiNoteSegmentIndex:
          typeof item.aiNoteSegmentIndex === "number"
            ? Math.max(0, item.aiNoteSegmentIndex)
            : typeof item.lastNoteSegmentIndex === "number"
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
            : "Sermon notes",
        summaryDocument:
          item.summaryDocument && typeof item.summaryDocument === "object"
            ? sanitizeAnnouncementDocument(item.summaryDocument)
            : null,
        summaryAiDraft:
          item.summaryAiDraft && typeof item.summaryAiDraft === "object"
            ? sanitizeAnnouncementDocument(item.summaryAiDraft)
            : null,
        summaryAiTitle: optionalSessionText(item.summaryAiTitle),
      }
    })
    .filter(retainSession)
}

async function getStore() {
  sermonStore ??= await load(STORE_FILE, { autoSave: false, defaults: {} })
  return sermonStore
}

async function persist(state: SermonState) {
  try {
    const store = await getStore()
    await store.set("version", 5)
    await store.set(STORE_KEY, state.sessions.filter(retainSession))
    await store.set("selectedSessionId", state.selectedSessionId)
    await store.set("pendingSummaryDocument", state.pendingSummaryDocument)
    await store.set("pendingSummaryTitle", state.pendingSummaryTitle)
    await store.save()
    useSermonStore.setState({ saveError: null })
  } catch (error) {
    console.warn("[sermon] Failed to save sermon sessions", error)
    useSermonStore.setState({
      saveError:
        "Could not save this sermon. Keep the app open and try saving again.",
    })
    throw error
  }
}

function queuePersist(state: SermonState) {
  pendingPersist = pendingPersist.catch(() => {}).then(() => persist(state))
  return pendingPersist
}

export const useSermonStore = create<SermonState>((set) => ({
  sessions: [],
  activeSessionId: null,
  transition: null,
  recoverySessionId: null,
  saveError: null,
  selectedSessionId: null,
  pendingSummaryDocument: null,
  pendingSummaryTitle: "",
  setPendingSummaryDocument: (document) => {
    const sanitized = sanitizeAnnouncementDocument(document)
    pendingSummaryRevision += 1
    set({
      pendingSummaryDocument: announcementPlainText(sanitized)
        ? sanitized
        : null,
    })
  },
  setPendingSummaryTitle: (title) => {
    pendingSummaryTitleRevision += 1
    set({ pendingSummaryTitle: title.slice(0, 120) })
  },
  prepareSession: (title, details) => {
    const now = Date.now()
    const id = crypto.randomUUID()
    set((state) => ({
      sessions: [
        ...state.sessions,
        {
          id,
          title: title.trim().slice(0, 120) || defaultTitle(),
          speaker: optionalSessionText(details?.speaker),
          series: optionalSessionText(details?.series),
          prepared: true,
          startedAt: now,
          endedAt: null,
          transcriptStartIndex: 0,
          transcript: [],
          lastNoteSegmentIndex: 0,
          notes: [],
          queuedNoteIds: [],
          finalSummary: null,
          summaryTitle: state.pendingSummaryTitle.trim() || "Sermon notes",
          summaryDocument: state.pendingSummaryDocument,
          directScriptures: [],
          recordingSpans: [],
          pausedAt: null,
          lastCheckpointAt: now,
        },
      ].filter(retainSession),
      selectedSessionId: id,
      pendingSummaryDocument: null,
      pendingSummaryTitle: "",
    }))
    return id
  },
  updateSessionDetails: (id, details) =>
    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === id
          ? {
              ...session,
              title: details.title?.trim().slice(0, 120) || session.title,
              speaker: optionalSessionText(details.speaker),
              series: optionalSessionText(details.series),
            }
          : session
      ),
    })),
  startSession: (transcriptStartIndex, id = crypto.randomUUID()) => {
    const startedAt = Date.now()
    set((state) => {
      const session: SermonSession = {
        id,
        title: defaultTitle(),
        startedAt,
        endedAt: null,
        transcriptStartIndex,
        transcript: [],
        lastNoteSegmentIndex: transcriptStartIndex,
        aiNoteSegmentIndex: transcriptStartIndex,
        notes: [],
        queuedNoteIds: [],
        finalSummary: null,
        summaryTitle: state.pendingSummaryTitle.trim() || "Sermon notes",
        summaryDocument: state.pendingSummaryDocument,
        transcriptSegments: [],
        scriptures: [],
        directScriptures: [],
        recordingSpans: [{ startedAt, endedAt: null }],
        pausedAt: null,
        lastCheckpointAt: startedAt,
      }
      return {
        sessions: [...state.sessions, session].filter(retainSession),
        activeSessionId: id,
        selectedSessionId: id,
        pendingSummaryDocument: null,
        pendingSummaryTitle: "",
      }
    })
    return id
  },
  pauseSession: (id, interrupted = false) => {
    const now = Date.now()
    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === id
          ? {
              ...session,
              pausedAt: now,
              interrupted,
              lastCheckpointAt: now,
              recordingSpans: (
                session.recordingSpans ?? [
                  { startedAt: session.startedAt, endedAt: null },
                ]
              ).map((span) => ({
                ...span,
                endedAt: span.endedAt ?? now,
              })),
            }
          : session
      ),
      activeSessionId:
        state.activeSessionId === id ? null : state.activeSessionId,
      selectedSessionId: id,
    }))
  },
  resumeSession: (id, transcriptStartIndex) => {
    const now = Date.now()
    set((state) => ({
      sessions: state.sessions.map((session) => {
        if (session.id !== id) return session
        const offset = transcriptStartIndex - session.transcriptStartIndex
        return {
          ...session,
          prepared: false,
          ...(session.prepared && !session.directScriptures
            ? { directScriptures: [] }
            : {}),
          startedAt: session.prepared ? now : session.startedAt,
          transcriptStartIndex,
          lastNoteSegmentIndex: Math.max(
            transcriptStartIndex,
            session.lastNoteSegmentIndex + offset
          ),
          aiNoteSegmentIndex: Math.max(
            transcriptStartIndex,
            (session.aiNoteSegmentIndex ?? session.lastNoteSegmentIndex) +
              offset
          ),
          notes: session.notes.map((note) => ({
            ...note,
            ...(note.sourceSegmentStartIndex !== undefined
              ? {
                  sourceSegmentStartIndex: Math.max(
                    transcriptStartIndex,
                    note.sourceSegmentStartIndex + offset
                  ),
                }
              : {}),
            ...(note.sourceSegmentEndIndex !== undefined
              ? {
                  sourceSegmentEndIndex: Math.max(
                    transcriptStartIndex,
                    note.sourceSegmentEndIndex + offset
                  ),
                }
              : {}),
          })),
          recordingSpans: [
            ...(session.recordingSpans ?? []),
            { startedAt: now, endedAt: null },
          ],
          pausedAt: null,
          interrupted: false,
          lastCheckpointAt: now,
        }
      }),
      activeSessionId: id,
      selectedSessionId: id,
      recoverySessionId: null,
    }))
  },
  setSummaryDocument: (id, document) =>
    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === id
          ? {
              ...session,
              summaryDocument: sanitizeAnnouncementDocument(document),
            }
          : session
      ),
    })),
  setAiSummaryDraft: (id, document, draft, title) =>
    set((state) => ({
      sessions: state.sessions.map((session) => {
        if (session.id !== id) return session
        const updateTitle =
          !session.summaryTitle.trim() ||
          session.summaryTitle === "Sermon notes" ||
          session.summaryTitle === session.summaryAiTitle
        return {
          ...session,
          summaryDocument: sanitizeAnnouncementDocument(document),
          summaryAiDraft: sanitizeAnnouncementDocument(draft),
          ...(updateTitle
            ? { summaryTitle: title, summaryAiTitle: title }
            : {}),
        }
      }),
    })),
  completeSession: (id, finalSummary, transcript) =>
    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === id
          ? {
              ...session,
              endedAt: Date.now(),
              finalSummary,
              transcript,
              recordingSpans: (
                session.recordingSpans ?? [
                  { startedAt: session.startedAt, endedAt: null },
                ]
              ).map((span) => ({
                ...span,
                endedAt: span.endedAt ?? Date.now(),
              })),
            }
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
            kind: "ai",
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
  addGeneratedNotes: (
    id,
    drafts,
    throughSegmentIndex,
    advanceAiCursor = true
  ) =>
    set((state) => ({
      sessions: state.sessions.map((session) => {
        if (session.id !== id) return session
        const notes = [...session.notes]
        const existing = new Map(
          notes.map((note, index) => [note.text.trim().toLowerCase(), index])
        )
        for (const input of drafts) {
          const draft = {
            ...input,
            text: input.text.trim(),
            sourceContext: input.sourceContext.trim(),
          }
          if (!draft.text || !draft.sourceContext) continue
          const key = draft.text.toLowerCase()
          const existingIndex = existing.get(key)
          if (existingIndex !== undefined) {
            if (!notes[existingIndex].sourceContext) {
              notes[existingIndex] = {
                ...notes[existingIndex],
                sourceContext: draft.sourceContext,
                sourceSegmentIds: draft.sourceSegmentIds,
                sourceSegmentStartIndex: draft.sourceSegmentStartIndex,
                sourceSegmentEndIndex: draft.sourceSegmentEndIndex,
              }
            }
            continue
          }
          existing.set(key, notes.length)
          notes.push({
            id: crypto.randomUUID(),
            text: draft.text,
            createdAt: Date.now(),
            source: "live",
            kind: "ai",
            sourceContext: draft.sourceContext,
            sourceSegmentIds: draft.sourceSegmentIds,
            sourceSegmentStartIndex: draft.sourceSegmentStartIndex,
            sourceSegmentEndIndex: draft.sourceSegmentEndIndex,
          })
        }
        return {
          ...session,
          notes,
          lastNoteSegmentIndex: Math.max(
            session.lastNoteSegmentIndex,
            throughSegmentIndex
          ),
          ...(advanceAiCursor
            ? {
                aiNoteSegmentIndex: Math.max(
                  session.aiNoteSegmentIndex ?? session.lastNoteSegmentIndex,
                  throughSegmentIndex
                ),
              }
            : {}),
        }
      }),
    })),
  addManualNote: (id, text, source) =>
    set((state) => ({
      sessions: state.sessions.map((session) => {
        if (session.id !== id || !text.trim()) return session
        const note: SermonNote = {
          id: crypto.randomUUID(),
          text: text.trim(),
          createdAt: Date.now(),
          source: "live",
          kind: "manual",
          ...(source
            ? {
                sourceContext: source.sourceContext.trim(),
                sourceSegmentIds: source.sourceSegmentIds,
                sourceSegmentStartIndex: source.sourceSegmentStartIndex,
                sourceSegmentEndIndex: source.sourceSegmentEndIndex,
              }
            : {}),
        }
        return { ...session, notes: [...session.notes, note] }
      }),
    })),
  markNotesProcessed: (id, throughSegmentIndex) =>
    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === id
          ? {
              ...session,
              lastNoteSegmentIndex: Math.max(
                session.lastNoteSegmentIndex,
                throughSegmentIndex
              ),
              aiNoteSegmentIndex: Math.max(
                session.aiNoteSegmentIndex ?? session.lastNoteSegmentIndex,
                throughSegmentIndex
              ),
            }
          : session
      ),
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
  removeLiveNote: (sessionId, noteId) =>
    set((state) => ({
      sessions: state.sessions.map((session) => {
        if (session.id !== sessionId) return session
        const note = session.notes.find((candidate) => candidate.id === noteId)
        if (note?.source !== "live") return session
        return {
          ...session,
          notes: session.notes.filter((candidate) => candidate.id !== noteId),
          queuedNoteIds: session.queuedNoteIds.filter((id) => id !== noteId),
        }
      }),
    })),
  clearLiveNotes: (sessionId) =>
    set((state) => ({
      sessions: state.sessions.map((session) => {
        if (session.id !== sessionId) return session
        const remainingNotes = session.notes.filter(
          (note) => note.source !== "live"
        )
        const remainingIds = new Set(remainingNotes.map((note) => note.id))
        return {
          ...session,
          notes: remainingNotes,
          queuedNoteIds: session.queuedNoteIds.filter((id) =>
            remainingIds.has(id)
          ),
        }
      }),
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
  const pendingRevisionAtStart = pendingSummaryRevision
  const pendingTitleRevisionAtStart = pendingSummaryTitleRevision
  hydrationPromise = (async () => {
    try {
      const store = await getStore()
      const sessions = sanitizeSessions(
        await store.get<unknown>(STORE_KEY)
      ).map(recoverSermon)
      const storedSelected = await store.get<string>("selectedSessionId")
      const storedPending = await store.get<unknown>("pendingSummaryDocument")
      const storedPendingTitle = await store.get<unknown>("pendingSummaryTitle")
      const pendingDocument = storedPending
        ? sanitizeAnnouncementDocument(storedPending)
        : null
      const pendingChanged = pendingSummaryRevision !== pendingRevisionAtStart
      const pendingTitleChanged =
        pendingSummaryTitleRevision !== pendingTitleRevisionAtStart
      const selected =
        sessions.find((session) => session.id === storedSelected) ??
        sessions.at(-1) ??
        null
      useSermonStore.setState({
        sessions,
        activeSessionId: null,
        recoverySessionId:
          [...sessions]
            .reverse()
            .find((session) => session.endedAt === null && !session.prepared)
            ?.id ?? null,
        selectedSessionId: selected?.id ?? null,
        ...(pendingChanged
          ? {}
          : {
              pendingSummaryDocument:
                pendingDocument && announcementPlainText(pendingDocument)
                  ? pendingDocument
                  : null,
            }),
        ...(pendingTitleChanged
          ? {}
          : {
              pendingSummaryTitle:
                typeof storedPendingTitle === "string"
                  ? storedPendingTitle.slice(0, 120)
                  : "",
            }),
      })
      useSermonStore.subscribe((state, previous) => {
        if (
          state.sessions === previous.sessions &&
          state.selectedSessionId === previous.selectedSessionId &&
          state.pendingSummaryDocument === previous.pendingSummaryDocument &&
          state.pendingSummaryTitle === previous.pendingSummaryTitle
        ) {
          return
        }
        // Coalesce changes without indefinitely postponing a save while typing
        // or receiving a rapid stream of final transcript segments.
        if (saveTimer) return
        saveTimer = setTimeout(() => {
          saveTimer = null
          void queuePersist(useSermonStore.getState()).catch(() => {
            /* saveError is surfaced in the lifecycle UI. */
          })
        }, 500)
      })
      useTranscriptStore.subscribe((state, previous) => {
        if (
          state.segments !== previous.segments ||
          state.highlightedScriptures !== previous.highlightedScriptures
        ) {
          checkpointActiveSermon()
        }
      })
      // A heartbeat bounds the interruption time even during a silent passage.
      setInterval(checkpointActiveSermon, 5_000)
      if (
        pendingChanged ||
        pendingTitleChanged ||
        sessions.some((session) => session.interrupted)
      )
        void queuePersist(useSermonStore.getState()).catch(() => {
          /* saveError is surfaced in the lifecycle UI. */
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

/** Remove one inactive session, restoring it if the save fails. */
export async function removeSermonSession(id: string): Promise<void> {
  const before = useSermonStore.getState()
  const index = before.sessions.findIndex((session) => session.id === id)
  const removed = before.sessions[index]
  if (!removed) throw new Error("This session is no longer available.")
  if (before.activeSessionId === id)
    throw new Error("Stop listening before deleting this session.")

  const remaining = before.sessions.filter((session) => session.id !== id)
  const replacementId = before.activeSessionId ?? remaining.at(-1)?.id ?? null
  useSermonStore.setState({
    sessions: remaining,
    selectedSessionId:
      before.selectedSessionId === id
        ? replacementId
        : before.selectedSessionId,
    recoverySessionId:
      before.recoverySessionId === id ? null : before.recoverySessionId,
  })

  try {
    await flushSermonSessions()
  } catch (error) {
    useSermonStore.setState((current) => {
      if (current.sessions.some((session) => session.id === id)) return current
      const sessions = [...current.sessions]
      sessions.splice(Math.min(index, sessions.length), 0, removed)
      return {
        sessions,
        selectedSessionId:
          before.selectedSessionId === id &&
          current.selectedSessionId === replacementId
            ? id
            : current.selectedSessionId,
        recoverySessionId:
          before.recoverySessionId === id && current.recoverySessionId === null
            ? id
            : current.recoverySessionId,
      }
    })
    // A save queued during the failed removal must not overwrite the rollback.
    try {
      await flushSermonSessions()
    } catch {
      // saveError remains visible until the restored session can be saved.
    }
    throw error
  }
}

/** Copy live capture into its durable sermon, independently of finishing it. */
export function checkpointActiveSermon(): void {
  const state = useSermonStore.getState()
  const session = state.sessions.find(
    (candidate) => candidate.id === state.activeSessionId
  )
  if (!session) return
  const live = useTranscriptStore.getState()
  const transcriptSegments = live.segments.slice(session.transcriptStartIndex)
  useSermonStore.setState({
    sessions: state.sessions.map((candidate) =>
      candidate.id === session.id
        ? {
            ...candidate,
            transcriptSegments,
            transcript: transcriptSegments.map((segment) => segment.text),
            scriptures: [...live.highlightedScriptures],
            lastCheckpointAt: Date.now(),
          }
        : candidate
    ),
  })
}
