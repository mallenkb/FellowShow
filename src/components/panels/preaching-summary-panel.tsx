import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  AlertCircleIcon,
  BookOpenTextIcon,
  CheckIcon,
  LoaderCircleIcon,
  PlayIcon,
  RefreshCwIcon,
  SaveIcon,
  SparklesIcon,
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { announcementDocumentToVerse, announcementPlainText } from "@/lib/announcements"
import {
  generateSermonSummary,
  MIN_SUMMARY_TRANSCRIPT_CHARACTERS,
  SUMMARY_REFRESH_INTERVAL_MS,
  type SermonAiSummary,
} from "@/lib/sermon-ai-summary"
import { summaryToDocument } from "@/lib/sermon-actions"
import { normalizeSummaryDocument } from "@/lib/scripture-format"
import {
  useBroadcastStore,
  useSettingsStore,
  useSermonStore,
  useTranscriptStore,
} from "@/stores"
import type {
  AnnouncementDocument,
  PreachingSummary,
} from "@/types"

const AnnouncementEditor = lazy(
  () => import("@/components/announcements/announcement-editor")
)

const EMPTY_SUMMARY_DOCUMENT: AnnouncementDocument = {
  type: "doc",
  content: [{ type: "paragraph" }],
}

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatSessionTimestamp(timestamp: number) {
  return new Date(timestamp).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function formatDuration(startedAt: number, endedAt: number | null) {
  if (!endedAt) return "In progress"
  const totalSeconds = Math.max(0, Math.round((endedAt - startedAt) / 1_000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes === 0) return `${seconds}s`
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`
}

function summaryDocumentFromBullets(
  bullets: readonly string[]
): AnnouncementDocument {
  return {
    type: "doc",
    content: [
      {
        type: "bulletList",
        content: bullets.map((bullet) => ({
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: bullet }],
            },
          ],
        })),
      },
    ],
  }
}

function summaryFromAiDraft(draft: SermonAiSummary): PreachingSummary {
  return {
    overview: "",
    key_points: draft.bullets,
    scriptures: [],
  }
}

function DraftPreview({ draft }: { draft: SermonAiSummary }) {
  return (
    <div className="rounded-md border border-primary/30 bg-primary/5 p-2.5">
      <div className="flex items-center gap-2">
        <SparklesIcon className="size-3 text-primary" />
        <p className="text-[0.6875rem] font-semibold">AI draft ready</p>
        <Badge variant="outline" className="ml-auto text-[0.5625rem]">
          Review before applying
        </Badge>
      </div>
      <p className="mt-2 text-xs font-medium">{draft.title}</p>
      <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs leading-relaxed text-muted-foreground">
        {draft.bullets.map((bullet, index) => (
          <li key={`${index}-${bullet}`}>{bullet}</li>
        ))}
      </ul>
    </div>
  )
}

export function PreachingSummaryPanel() {
  const sessions = useSermonStore((state) => state.sessions)
  const selectedSessionId = useSermonStore((state) => state.selectedSessionId)
  const activeSessionId = useSermonStore((state) => state.activeSessionId)
  const transcriptSegments = useTranscriptStore((state) => state.segments)
  const hasOpenRouterKey = useSettingsStore((state) =>
    Boolean(state.openRouterApiKey?.trim())
  )
  const openRouterModel = useSettingsStore((state) => state.openRouterModel)
  const session =
    sessions.find((candidate) => candidate.id === selectedSessionId) ??
    sessions.at(-1) ??
    null

  const sourceSegments = useMemo(() => {
    if (!session) return []
    if (session.id === activeSessionId) {
      return transcriptSegments
        .slice(session.transcriptStartIndex)
        .map((segment) => segment.text)
    }
    return session.transcript
  }, [activeSessionId, session, transcriptSegments])
  const sourceText = useMemo(() => sourceSegments.join("\n"), [sourceSegments])
  const sourceCharacterCount = sourceText.trim().length
  const hasEnoughTranscript =
    sourceCharacterCount >= MIN_SUMMARY_TRANSCRIPT_CHARACTERS

  const [draft, setDraft] = useState<SermonAiSummary | null>(null)
  const [editorDocument, setEditorDocument] = useState<AnnouncementDocument>(
    EMPTY_SUMMARY_DOCUMENT
  )
  const [editorTitle, setEditorTitle] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [lastGeneratedAt, setLastGeneratedAt] = useState<number | null>(null)
  const [manualEditIds, setManualEditIds] = useState<ReadonlySet<string>>(
    () => new Set()
  )
  const previousSessionIdRef = useRef<string | null>(null)
  const manualEditIdsRef = useRef(new Set<string>())
  const editorDocumentsRef = useRef(new Map<string, AnnouncementDocument>())
  const editorTitlesRef = useRef(new Map<string, string>())
  const lastGeneratedAtRef = useRef(0)
  const lastSourceRef = useRef("")
  const generationIdRef = useRef(0)
  const isGeneratingRef = useRef(false)
  const activeControllerRef = useRef<AbortController | null>(null)
  const currentSourceRef = useRef(sourceText)
  const currentSessionIdRef = useRef(session?.id ?? null)
  currentSourceRef.current = sourceText
  currentSessionIdRef.current = session?.id ?? null

  const storedDocument = useMemo(() => {
    if (!session) return EMPTY_SUMMARY_DOCUMENT
    if (session.summaryDocument) {
      return normalizeSummaryDocument(session.summaryDocument)
    }
    if (session.finalSummary) return summaryToDocument(session.finalSummary)
    return EMPTY_SUMMARY_DOCUMENT
  }, [session])

  useEffect(() => {
    const sessionId = session?.id ?? null
    if (previousSessionIdRef.current !== sessionId) {
      setDraft(null)
      setGenerationError(null)
      setLastGeneratedAt(null)
      lastGeneratedAtRef.current = 0
      lastSourceRef.current = ""
      previousSessionIdRef.current = sessionId
    }

    if (!session) {
      setEditorDocument(EMPTY_SUMMARY_DOCUMENT)
      setEditorTitle("")
      return
    }

    setEditorDocument(
      editorDocumentsRef.current.get(session.id) ?? storedDocument
    )
    const storedTitle = session.summaryTitle.trim() || "Preaching Summary"
    setEditorTitle(
      editorTitlesRef.current.get(session.id) ?? storedTitle
    )
  }, [session, storedDocument])

  const refreshSummary = useCallback(
    async (force = false): Promise<void> => {
      if (!session || !hasOpenRouterKey || !hasEnoughTranscript) return
      const now = Date.now()
      if (
        !force &&
        (lastSourceRef.current === sourceText ||
          now - lastGeneratedAtRef.current < SUMMARY_REFRESH_INTERVAL_MS)
      ) {
        return
      }
      if (isGeneratingRef.current) return

      isGeneratingRef.current = true
      setIsGenerating(true)
      setGenerationError(null)
      const controller = new AbortController()
      activeControllerRef.current?.abort()
      activeControllerRef.current = controller
      const generationId = ++generationIdRef.current

      try {
        const nextDraft = await generateSermonSummary(
          sourceText,
          controller.signal
        )
        if (
          controller.signal.aborted ||
          generationId !== generationIdRef.current ||
          currentSourceRef.current !== sourceText ||
          currentSessionIdRef.current !== session.id
        ) {
          return
        }

        lastSourceRef.current = sourceText
        lastGeneratedAtRef.current = Date.now()
        setLastGeneratedAt(lastGeneratedAtRef.current)
        setDraft(nextDraft)
        const canAutoApply =
          !manualEditIdsRef.current.has(session.id) &&
          !session.summaryDocument &&
          !session.finalSummary
        if (canAutoApply) {
          const nextDocument = summaryDocumentFromBullets(nextDraft.bullets)
          editorDocumentsRef.current.set(session.id, nextDocument)
          editorTitlesRef.current.set(session.id, nextDraft.title)
          setEditorDocument(nextDocument)
          setEditorTitle(nextDraft.title)
        }
      } catch (error: unknown) {
        if (controller.signal.aborted || generationId !== generationIdRef.current) {
          return
        }
        setGenerationError(
          error instanceof Error
            ? error.message
            : "Could not generate an AI summary."
        )
      } finally {
        if (generationId === generationIdRef.current) {
          isGeneratingRef.current = false
          activeControllerRef.current = null
          setIsGenerating(false)
        }
      }
    },
    [hasEnoughTranscript, hasOpenRouterKey, session, sourceText]
  )

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshSummary().catch(() => undefined)
    }, 800)
    const interval = window.setInterval(() => {
      void refreshSummary().catch(() => undefined)
    }, SUMMARY_REFRESH_INTERVAL_MS)

    return () => {
      window.clearTimeout(timer)
      window.clearInterval(interval)
      activeControllerRef.current?.abort()
      activeControllerRef.current = null
      isGeneratingRef.current = false
      setIsGenerating(false)
    }
  }, [refreshSummary])

  const markManualEdit = useCallback((sessionId: string) => {
    manualEditIdsRef.current.add(sessionId)
    setManualEditIds((current) => {
      if (current.has(sessionId)) return current
      return new Set([...current, sessionId])
    })
  }, [])

  const handleDocumentChange = useCallback(
    (document: AnnouncementDocument) => {
      if (!session) return
      markManualEdit(session.id)
      editorDocumentsRef.current.set(session.id, document)
      setEditorDocument(document)
    },
    [markManualEdit, session]
  )

  const handleTitleChange = useCallback(
    (title: string) => {
      if (!session) return
      markManualEdit(session.id)
      editorTitlesRef.current.set(session.id, title)
      setEditorTitle(title)
    },
    [markManualEdit, session]
  )

  const hasManualEdits = session ? manualEditIds.has(session.id) : false
  const hasStoredSummary = Boolean(
    session?.summaryDocument || session?.finalSummary
  )

  const saveSummary = useCallback(() => {
    if (!session) return
    const document = normalizeSummaryDocument(editorDocument)
    const plainText = announcementPlainText(document)
    if (!plainText && !draft) return

    const summary = draft && !hasManualEdits
      ? summaryFromAiDraft(draft)
      : session.finalSummary ?? {
          overview: plainText,
          key_points: [],
          scriptures: [],
        }
    const title =
      editorTitle.trim() || draft?.title.trim() || session.summaryTitle || "Preaching Summary"
    const store = useSermonStore.getState()
    store.setSummaryTitle(session.id, title)
    store.setFinalSummary(session.id, summary, document)
    editorDocumentsRef.current.set(session.id, document)
    editorTitlesRef.current.set(session.id, title)
    setEditorDocument(document)
    setEditorTitle(title)
    toast.success("Summary saved")
  }, [draft, editorDocument, editorTitle, hasManualEdits, session])

  const showSummaryLive = useCallback(() => {
    if (!session) return
    const document = normalizeSummaryDocument(editorDocument)
    if (!announcementPlainText(document)) return
    const heading =
      editorTitle.trim() || draft?.title.trim() || session.summaryTitle || "Preaching Summary"
    useBroadcastStore
      .getState()
      .presentOnLive(announcementDocumentToVerse(document, heading), null)
  }, [draft, editorDocument, editorTitle, session])

  const hasSummaryContent = Boolean(announcementPlainText(editorDocument))
  const canShowLive = hasSummaryContent
  const saveLabel = draft && !hasManualEdits ? "Apply AI draft" : "Save edits"

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
        <Select
          value={session?.id ?? ""}
          onValueChange={(value) =>
            useSermonStore.getState().selectSession(value)
          }
          disabled={sessions.length === 0}
        >
          <SelectTrigger
            size="sm"
            className="min-w-0 flex-1 text-xs"
            aria-label="Sermon session"
          >
            <span className="min-w-0 truncate">
              {session?.title ?? "No sermons yet"}
            </span>
          </SelectTrigger>
          <SelectContent position="popper" align="start">
            {[...sessions].reverse().map((candidate) => (
              <SelectItem
                key={candidate.id}
                value={candidate.id}
                textValue={candidate.title}
              >
                <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                  <span className="min-w-0 truncate">{candidate.title}</span>
                  <span className="shrink-0 text-[0.625rem] text-muted-foreground">
                    {formatSessionTimestamp(candidate.startedAt)}
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {!session ? (
          <div className="flex min-h-full flex-col items-center justify-center gap-2 p-6 text-center">
            <BookOpenTextIcon className="size-5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Completed sermon summaries appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <section className="space-y-3 rounded-lg border border-border bg-background/30 p-3">
              <header className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <Input
                    value={session.title}
                    aria-label="Sermon session title"
                    className="h-8 px-2.5 text-sm font-medium"
                    onChange={(event) =>
                      useSermonStore
                        .getState()
                        .updateSessionTitle(session.id, event.target.value)
                    }
                  />
                  <p className="mt-0.5 text-[0.625rem] text-muted-foreground">
                    {formatTime(session.startedAt)}
                    {session.endedAt
                      ? ` – ${formatTime(session.endedAt)}`
                      : " · In progress"}
                  </p>
                </div>
                <Badge variant={session.endedAt ? "outline" : "secondary"}>
                  {session.endedAt ? "Ended" : "Live"}
                </Badge>
              </header>
              <div className="grid grid-cols-4 gap-3 border-t border-border/70 pt-3">
                <div>
                  <p className="text-[0.625rem] tracking-wide text-muted-foreground uppercase">
                    Duration
                  </p>
                  <p className="mt-0.5 text-sm font-semibold tabular-nums">
                    {formatDuration(session.startedAt, session.endedAt)}
                  </p>
                </div>
                <div>
                  <p className="text-[0.625rem] tracking-wide text-muted-foreground uppercase">
                    Time range
                  </p>
                  <p className="mt-0.5 text-sm font-semibold tabular-nums">
                    {formatTime(session.startedAt)}
                    {session.endedAt ? ` – ${formatTime(session.endedAt)}` : ""}
                  </p>
                </div>
                <div>
                  <p className="text-[0.625rem] tracking-wide text-muted-foreground uppercase">
                    Transcript
                  </p>
                  <p className="mt-0.5 text-sm font-semibold tabular-nums">
                    {sourceSegments.length} segments
                  </p>
                </div>
                <div>
                  <p className="text-[0.625rem] tracking-wide text-muted-foreground uppercase">
                    Live notes
                  </p>
                  <p className="mt-0.5 text-sm font-semibold tabular-nums">
                    {session.notes.filter((note) => note.source === "live").length}
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-3 rounded-md border border-border bg-muted/20 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <SparklesIcon className="size-3.5 text-primary" />
                  <h3 className="text-xs font-semibold">Preaching summary</h3>
                  <Badge variant={hasManualEdits ? "outline" : "secondary"}>
                    {hasManualEdits ? "Manual" : draft ? "AI draft" : "Saved"}
                  </Badge>
                </div>
                <div className="ml-auto flex flex-wrap items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    disabled={!hasOpenRouterKey || !hasEnoughTranscript || isGenerating}
                    onClick={() => void refreshSummary(true).catch(() => undefined)}
                  >
                    {isGenerating ? (
                      <LoaderCircleIcon className="size-3 animate-spin" />
                    ) : (
                      <RefreshCwIcon className="size-3" />
                    )}
                    Regenerate
                  </Button>
                  <Button
                    type="button"
                    size="xs"
                    disabled={!canShowLive}
                    onClick={showSummaryLive}
                  >
                    <PlayIcon className="size-3" /> Show Live
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.625rem] text-muted-foreground">
                <span>
                  {hasOpenRouterKey
                    ? `AI model: ${openRouterModel || "OpenRouter default"}`
                    : "AI model not configured"}
                </span>
                {lastGeneratedAt ? (
                  <span>Updated {formatTime(lastGeneratedAt)}</span>
                ) : null}
              </div>

              {!hasOpenRouterKey ? (
                <div className="flex items-start gap-2 rounded-md border border-dashed border-border p-2.5 text-xs text-muted-foreground">
                  <AlertCircleIcon className="mt-0.5 size-3.5 shrink-0" />
                  <p>
                    Add an OpenRouter API key in Settings → AI Model / OpenRouter
                    to generate summaries. You can still write and save this
                    summary manually.
                  </p>
                </div>
              ) : !hasEnoughTranscript ? (
                <p className="text-xs text-muted-foreground">
                  Keep transcribing to build an AI summary. It will refresh after
                  enough transcript is available without changing the live
                  transcript view.
                </p>
              ) : null}

              {generationError ? (
                <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-2.5 text-xs text-destructive">
                  <AlertCircleIcon className="mt-0.5 size-3.5 shrink-0" />
                  <p>{generationError}</p>
                </div>
              ) : null}

              {draft && (hasManualEdits || hasStoredSummary) ? (
                <DraftPreview draft={draft} />
              ) : null}

              <label className="grid gap-1">
                <span className="text-[0.625rem] font-medium tracking-wide text-muted-foreground uppercase">
                  Title
                </span>
                <Input
                  value={editorTitle}
                  className="normal-case"
                  onChange={(event) => handleTitleChange(event.target.value)}
                  placeholder="Preaching Summary"
                />
              </label>

              <Suspense
                fallback={
                  <div className="h-40 animate-pulse rounded-md bg-muted/40" />
                }
              >
                <AnnouncementEditor
                  content={editorDocument}
                  onChange={handleDocumentChange}
                />
              </Suspense>

              <div className="flex items-center gap-2 border-t border-border/70 pt-2">
                <p className="mr-auto text-[0.625rem] text-muted-foreground">
                  Edit the slide before applying or showing it live.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  disabled={!hasSummaryContent}
                  onClick={saveSummary}
                >
                  {draft ? (
                    <CheckIcon className="size-3" />
                  ) : (
                    <SaveIcon className="size-3" />
                  )}
                  {saveLabel}
                </Button>
              </div>
            </section>

            {sourceSegments.length > 0 ? (
              <details className="rounded-md border border-border bg-muted/10">
                <summary className="cursor-pointer px-2.5 py-2 text-xs font-semibold text-foreground marker:text-muted-foreground">
                  Source transcript · {sourceSegments.length} segments
                </summary>
                <p className="max-h-48 overflow-y-auto border-t border-border px-2.5 py-2 text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
                  {sourceSegments.join("\n\n")}
                </p>
              </details>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
