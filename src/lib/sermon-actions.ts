import { toast } from "sonner"
import {
  transcriptionActions,
  type TranscriptionKeyService,
} from "@/hooks/use-transcription"
import { invoke } from "@/lib/ipc"
import { normalizePreachingSummary } from "@/lib/scripture-format"
import {
  checkpointActiveSermon,
  flushSermonSessions,
  removeSermonSession,
  useSermonStore,
} from "@/stores/sermon-store"
import { waitForStartup } from "@/lib/startup-ready"
import { useTranscriptStore } from "@/stores/transcript-store"
import type {
  AnnouncementDocument,
  PreachingSummary,
  SermonSession,
} from "@/types"

let noteGenerationPromise: Promise<void> | null = null
let startSermonPromise: Promise<boolean> | null = null
let endSermonPromise: Promise<void> | null = null
let cancelSermonStart = false
let deleteSermonPromise: Promise<void> | null = null

export function isSermonDeletionInProgress(): boolean {
  return deleteSermonPromise !== null
}

function sessionSegments(session: SermonSession) {
  return useTranscriptStore
    .getState()
    .segments.slice(session.transcriptStartIndex)
}

async function summarizeTranscript(
  segments: string[],
  scriptures: string[]
): Promise<PreachingSummary> {
  const summary = await invoke("summarize_preaching", {
    segments,
    scriptures,
  })
  return normalizePreachingSummary(summary)
}

export function summaryToDocument(
  summary: PreachingSummary
): AnnouncementDocument {
  const normalized = normalizePreachingSummary(summary)
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: normalized.overview,
            marks: [{ type: "bold" }],
          },
        ],
      },
      ...(summary.key_points.length > 0
        ? [
            {
              type: "bulletList",
              content: normalized.key_points.map((point) => ({
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: point }],
                  },
                ],
              })),
            },
          ]
        : []),
    ],
  }
}

export function startSermon(
  onMissingApiKey?: (service: TranscriptionKeyService) => void
): Promise<boolean> {
  return beginSermon(onMissingApiKey)
}

export function resumeSermon(
  sessionId: string,
  onMissingApiKey?: (service: TranscriptionKeyService) => void
): Promise<boolean> {
  return beginSermon(onMissingApiKey, sessionId)
}

async function beginSermon(
  onMissingApiKey?: (service: TranscriptionKeyService) => void,
  resumeId?: string
): Promise<boolean> {
  if (deleteSermonPromise)
    throw new Error("Wait for the session to finish deleting.")
  if (startSermonPromise) return startSermonPromise
  cancelSermonStart = false
  useSermonStore.setState({ transition: "starting" })
  startSermonPromise = (async () => {
    if (endSermonPromise) await endSermonPromise
    await waitForStartup()
    if (cancelSermonStart) return false
    const store = useSermonStore.getState()
    if (store.activeSessionId) {
      if (resumeId && store.activeSessionId !== resumeId) {
        throw new Error(
          "Pause the current sermon before continuing another one."
        )
      }
      return true
    }
    const saved = resumeId
      ? store.sessions.find((session) => session.id === resumeId)
      : undefined
    if (resumeId && (!saved || saved.endedAt !== null)) {
      throw new Error(
        "This sermon is already finished. Start a new sermon instead."
      )
    }
    const previousTranscript = useTranscriptStore.getState()
    const lastSegmentId = previousTranscript.segments.at(-1)?.id
    const restoredSegments = saved?.transcriptSegments?.length
      ? saved.transcriptSegments
      : (saved?.transcript.map((text, index) => ({
          id: `${saved.id}-restored-${index}`,
          text,
          timestamp: saved.startedAt,
          is_final: true,
          confidence: 0,
          words: [],
        })) ?? [])
    useTranscriptStore.setState({
      ...(saved ? { segments: restoredSegments, currentPartial: "" } : {}),
      highlightedScriptures: saved?.scriptures ?? [],
    })
    const sermonId = saved?.id ?? crypto.randomUUID()
    await transcriptionActions.start(onMissingApiKey, sermonId)
    const transcript = useTranscriptStore.getState()
    if (cancelSermonStart || !transcript.isTranscribing) {
      useTranscriptStore.setState({
        ...(saved
          ? {
              segments: previousTranscript.segments,
              currentPartial: previousTranscript.currentPartial,
            }
          : {}),
        highlightedScriptures: previousTranscript.highlightedScriptures,
      })
      return false
    }
    if (saved) {
      useSermonStore.getState().resumeSession(saved.id, 0)
    } else {
      const transcriptStartIndex = lastSegmentId
        ? transcript.segments.findIndex(
            (segment) => segment.id === lastSegmentId
          ) + 1
        : 0
      useSermonStore.getState().startSession(transcriptStartIndex, sermonId)
    }
    checkpointActiveSermon()
    try {
      await flushSermonSessions()
    } catch {
      const listening = useSermonStore.getState().activeSessionId !== null
      toast.error(
        listening
          ? "Listening started, but the sermon could not be saved"
          : "The paused sermon could not be saved",
        {
          description:
            "Keep the app open and retry saving from the session notice.",
        }
      )
      return listening
    }
    if (!useSermonStore.getState().activeSessionId) return false
    toast.success(
      saved && !saved.prepared ? "Sermon continued" : "Sermon started"
    )
    return true
  })().finally(() => {
    startSermonPromise = null
    if (useSermonStore.getState().transition === "starting") {
      useSermonStore.setState({ transition: null })
    }
  })
  return startSermonPromise
}

export async function generateLiveSermonNotes(force = false): Promise<void> {
  if (noteGenerationPromise) return noteGenerationPromise
  const sermonState = useSermonStore.getState()
  const session = sermonState.sessions.find(
    (candidate) => candidate.id === sermonState.activeSessionId
  )
  if (!session) return
  const segmentCount = useTranscriptStore.getState().segments.length
  if (!force && segmentCount - session.lastNoteSegmentIndex < 4) return
  if (segmentCount <= session.transcriptStartIndex) return
  const capturedSegments = [...sessionSegments(session)]
  const capturedScriptures = [
    ...useTranscriptStore.getState().highlightedScriptures,
  ]

  noteGenerationPromise = (async () => {
    try {
      const summary = await invoke("summarize_preaching", {
        segments: capturedSegments.map((segment) => segment.text),
        scriptures: capturedScriptures,
      })
      if (useSermonStore.getState().activeSessionId !== session.id) return
      const normalized = normalizePreachingSummary(summary)
      const drafts = summary.key_points.flatMap((rawPoint, index) => {
        const point = rawPoint.trim()
        const sourceIndex = capturedSegments.findIndex((segment) => {
          const text = segment.text.trim()
          return (
            text === point ||
            (point.endsWith("…") &&
              text.startsWith(point.slice(0, -1).trimEnd()))
          )
        })
        const source = capturedSegments[sourceIndex]
        if (!source) return []
        return [
          {
            text: normalized.key_points[index],
            sourceContext: source.text.trim(),
            sourceSegmentIds: [source.id],
            sourceSegmentStartIndex: session.transcriptStartIndex + sourceIndex,
            sourceSegmentEndIndex: session.transcriptStartIndex + sourceIndex,
          },
        ]
      })
      useSermonStore
        .getState()
        .addGeneratedNotes(session.id, drafts, segmentCount, false)
    } catch (error) {
      if (force) {
        toast.error("Could not generate sermon notes", {
          description: String(error),
        })
      }
    } finally {
      noteGenerationPromise = null
    }
  })()
  return noteGenerationPromise
}

export function pauseSermon(): Promise<void> {
  return settleSermon(false)
}

export function deleteSermon(sessionId: string): Promise<void> {
  if (deleteSermonPromise)
    return Promise.reject(new Error("A session is already being deleted."))
  const operation = (async () => {
    await waitForStartup()
    let state = useSermonStore.getState()
    const session = state.sessions.find((item) => item.id === sessionId)
    if (!session) throw new Error("This session is no longer available.")
    if (state.transition)
      throw new Error("Wait for the current sermon action to finish.")
    const wasActive = state.activeSessionId === sessionId
    if (wasActive) {
      await settleSermon(false, { silentPause: true, fromDeletion: true })
    }
    state = useSermonStore.getState()
    if (state.transition || state.activeSessionId === sessionId)
      throw new Error("Could not stop listening. The session was not deleted.")

    const captured = state.sessions.find((item) => item.id === sessionId)
    if (!captured) throw new Error("This session is no longer available.")
    useSermonStore.setState({ transition: "deleting" })
    try {
      await removeSermonSession(sessionId)
      try {
        await invoke("delete_sermon_audio", { sermonId: sessionId })
      } catch (error) {
        toast.error("Could not remove the session audio", {
          description: String(error),
        })
      }
      // A different active sermon may share this live list, so leave it intact.
      if (!useSermonStore.getState().activeSessionId) {
        const transcript = useTranscriptStore.getState()
        const ids = new Set(
          captured.transcriptSegments?.map((segment) => segment.id) ?? []
        )
        const remaining = transcript.segments.filter(
          (segment) =>
            !ids.has(segment.id) &&
            !segment.id.startsWith(`${sessionId}-restored-`)
        )
        if (remaining.length !== transcript.segments.length || wasActive) {
          useTranscriptStore.setState({
            segments: remaining,
            currentPartial: wasActive ? "" : transcript.currentPartial,
            highlightedScriptures:
              wasActive || remaining.length === 0
                ? []
                : transcript.highlightedScriptures,
          })
        }
      }
    } finally {
      if (useSermonStore.getState().transition === "deleting")
        useSermonStore.setState({ transition: null })
    }
  })()
  deleteSermonPromise = operation.finally(() => {
    deleteSermonPromise = null
  })
  return deleteSermonPromise
}

export function endSermon(
  options: {
    sessionId?: string
    waitForNotes?: boolean
  } = {}
): Promise<void> {
  return settleSermon(true, options)
}

async function settleSermon(
  finish: boolean,
  options: {
    sessionId?: string
    waitForNotes?: boolean
    silentPause?: boolean
    fromDeletion?: boolean
  } = {}
): Promise<void> {
  if (deleteSermonPromise && !options.fromDeletion)
    throw new Error("Wait for the session to finish deleting.")
  if (endSermonPromise) return endSermonPromise
  useSermonStore.setState({ transition: finish ? "ending" : "pausing" })
  endSermonPromise = (async () => {
    if (startSermonPromise) {
      cancelSermonStart = true
      await Promise.all([startSermonPromise, transcriptionActions.stop()])
    }
    const state = useSermonStore.getState()
    const id = options.sessionId ?? state.activeSessionId
    const session = state.sessions.find((candidate) => candidate.id === id)
    if (!session || session.endedAt !== null) return
    if (id === state.activeSessionId) {
      await transcriptionActions.stop()
      checkpointActiveSermon()
    }
    const captured = useSermonStore
      .getState()
      .sessions.find((candidate) => candidate.id === id)
    if (!captured) return
    if (!finish) {
      useSermonStore.getState().pauseSession(captured.id)
      await flushSermonSessions()
      if (!options.silentPause) {
        toast.success("Sermon paused", {
          description:
            "Transcript and notes saved. You can continue this sermon later.",
        })
      }
      return
    }
    const transcript = captured.transcript
    const scriptures = captured.scriptures ?? []
    useSermonStore.getState().completeSession(captured.id, null, transcript)
    await flushSermonSessions()
    toast.success("Sermon finished", {
      description:
        transcript.length > 0
          ? "Transcript saved. Creating sermon notes…"
          : "Transcript saved.",
    })
    if (transcript.length > 0) {
      const notes = summarizeTranscript(transcript, scriptures).then(
        async (summary) => {
          const store = useSermonStore.getState()
          const savedSession = store.sessions.find(
            (candidate) => candidate.id === captured.id
          )
          if (!savedSession) return
          const savedDocument = savedSession.summaryDocument
          store.setFinalSummary(
            captured.id,
            summary,
            savedDocument ?? summaryToDocument(summary)
          )
          await flushSermonSessions()
          toast.success("Sermon notes ready")
        }
      )
      if (options.waitForNotes) {
        await notes
      } else {
        void notes.catch((error: unknown) => {
          toast.error(
            "The sermon was saved, but its notes could not be created",
            { description: String(error) }
          )
        })
      }
    }
  })().finally(() => {
    endSermonPromise = null
    const transition = useSermonStore.getState().transition
    if (transition === "ending" || transition === "pausing") {
      useSermonStore.setState({ transition: null })
    }
  })
  return endSermonPromise
}
