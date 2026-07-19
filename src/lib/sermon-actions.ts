import { toast } from "sonner"
import { transcriptionActions } from "@/hooks/use-transcription"
import { invoke } from "@/lib/ipc"
import { announcementDocumentToVerse } from "@/lib/announcements"
import {
  normalizePreachingSummary,
  normalizeSummaryDocument,
} from "@/lib/scripture-format"
import { flushSermonSessions, useSermonStore } from "@/stores/sermon-store"
import { useTranscriptStore } from "@/stores/transcript-store"
import type {
  AnnouncementDocument,
  PreachingSummary,
  SermonSession,
  VerseRenderData,
} from "@/types"

let noteGenerationPromise: Promise<void> | null = null
let startSermonPromise: Promise<boolean> | null = null
let endSermonPromise: Promise<void> | null = null

function sessionSegments(session: SermonSession) {
  return useTranscriptStore
    .getState()
    .segments.slice(session.transcriptStartIndex)
}

async function summarize(session: SermonSession): Promise<PreachingSummary> {
  const transcript = useTranscriptStore.getState()
  return summarizeTranscript(
    sessionSegments(session).map((segment) => segment.text),
    transcript.highlightedScriptures
  )
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

export async function startSermon(
  onMissingApiKey?: () => void
): Promise<boolean> {
  if (startSermonPromise) return startSermonPromise

  startSermonPromise = (async () => {
    if (endSermonPromise) await endSermonPromise
    const sermon = useSermonStore.getState()
    if (sermon.activeSessionId) return true

    const transcript = useTranscriptStore.getState()
    if (!transcript.isTranscribing) {
      await transcriptionActions.start(onMissingApiKey)
      if (!useTranscriptStore.getState().isTranscribing) return false
    }

    sermon.startSession(useTranscriptStore.getState().segments.length)
    toast.success("Sermon started")
    return true
  })().finally(() => {
    startSermonPromise = null
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

  noteGenerationPromise = (async () => {
    try {
      const summary = await summarize(session)
      useSermonStore
        .getState()
        .addNotes(session.id, summary.key_points, segmentCount, "live")
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

export async function endSermon(): Promise<void> {
  if (endSermonPromise) return endSermonPromise

  endSermonPromise = (async () => {
    if (startSermonPromise) await startSermonPromise
    const sermonState = useSermonStore.getState()
    const session = sermonState.sessions.find(
      (candidate) => candidate.id === sermonState.activeSessionId
    )
    if (!session) return

    await transcriptionActions.stop()
    const transcriptState = useTranscriptStore.getState()
    const transcript = sessionSegments(session).map((segment) => segment.text)
    const scriptures = [...transcriptState.highlightedScriptures]

    useSermonStore.getState().completeSession(session.id, null, transcript)
    await flushSermonSessions()
    toast.success("Sermon ended", {
      description: "Transcript saved. Creating the final summary…",
    })

    if (transcript.length > 0) {
      void summarizeTranscript(transcript, scriptures)
        .then(async (summary) => {
          const store = useSermonStore.getState()
          store.setFinalSummary(session.id, summary, summaryToDocument(summary))
          await flushSermonSessions()
          toast.success("Sermon summary ready")
        })
        .catch((error: unknown) => {
          toast.error("The sermon was saved, but its summary failed", {
            description: String(error),
          })
        })
    }
  })().finally(() => {
    endSermonPromise = null
  })

  return endSermonPromise
}

export function sermonQueueToPreview(
  session: SermonSession
): VerseRenderData | null {
  const queuedIds = new Set(session.queuedNoteIds)
  const notes = session.notes.filter(
    (note) => note.source === "live" && queuedIds.has(note.id)
  )
  if (notes.length === 0) return null
  return announcementDocumentToVerse(
    {
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: notes.map((note) => ({
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: note.text.trim() }],
              },
            ],
          })),
        },
      ],
    },
    "Sermon Notes"
  )
}

export function sermonSummaryToRenderData(
  session: SermonSession
): VerseRenderData | null {
  if (!session.finalSummary) return null
  return announcementDocumentToVerse(
    normalizeSummaryDocument(
      session.summaryDocument ?? summaryToDocument(session.finalSummary)
    ),
    session.summaryTitle.trim() || "Preaching Summary"
  )
}
