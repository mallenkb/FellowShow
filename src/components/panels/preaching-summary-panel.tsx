import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  AlertCircleIcon,
  NotebookTextIcon,
  SaveIcon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { LiveActionButton } from "@/components/ui/live-action-button"
import { Input } from "@/components/ui/input"
import { PreachingSummarySessionBar } from "@/components/panels/preaching-summary-session-bar"
import { SermonNotesHeader } from "@/components/panels/sermon-notes-header"
import { SendToOverlayButton } from "@/components/on-display/send-to-overlay"
import {
  announcementDocumentToVerse,
  announcementPlainText,
} from "@/lib/announcements"
import {
  generateSermonSummary,
  MIN_SUMMARY_TRANSCRIPT_CHARACTERS,
  SUMMARY_REFRESH_INTERVAL_MS,
  type SermonAiSummary,
} from "@/lib/sermon-ai-summary"
import {
  mergeSermonAiDraft,
  summaryDocumentFromBullets,
} from "@/lib/sermon-ai-draft"
import { summaryToDocument } from "@/lib/sermon-actions"
import { normalizeSummaryDocument } from "@/lib/scripture-format"
import { openSettings } from "@/lib/settings-dialog"
import {
  useAnnouncementStore,
  useBroadcastStore,
  useSettingsStore,
  useSermonStore,
  useTranscriptStore,
} from "@/stores"
import type { AnnouncementDocument, PreachingSummary } from "@/types"

const AnnouncementEditor = lazy(
  () => import("@/components/announcements/announcement-editor")
)

const SUMMARY_NOTES_SET = "Sermon summaries"

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

function summaryFromAiDraft(draft: SermonAiSummary): PreachingSummary {
  return {
    overview: "",
    key_points: draft.bullets,
    scriptures: [],
  }
}

export function PreachingSummaryPanel({
  isActive = true,
}: {
  isActive?: boolean
}) {
  const sessions = useSermonStore((state) => state.sessions)
  const selectedSessionId = useSermonStore((state) => state.selectedSessionId)
  const activeSessionId = useSermonStore((state) => state.activeSessionId)
  const pendingSummaryDocument = useSermonStore(
    (state) => state.pendingSummaryDocument
  )
  const pendingSummaryTitle = useSermonStore(
    (state) => state.pendingSummaryTitle
  )
  const transcriptSegments = useTranscriptStore((state) => state.segments)
  const aiProvider = useSettingsStore((state) => state.aiProvider)
  const aiConfigured = useSettingsStore((state) =>
    state.aiProvider === "openai"
      ? Boolean(state.sermonOpenAiApiKey?.trim())
      : Boolean(state.openRouterApiKey?.trim())
  )
  const aiModel = useSettingsStore((state) =>
    state.aiProvider === "openai"
      ? state.sermonOpenAiModel
      : state.openRouterModel
  )
  const aiProviderName = aiProvider === "openai" ? "OpenAI" : "OpenRouter"
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
  const [showSessions, setShowSessions] = useState(false)
  const currentDocument = session
    ? editorDocument
    : (pendingSummaryDocument ?? EMPTY_SUMMARY_DOCUMENT)
  const currentTitle = session ? editorTitle : pendingSummaryTitle
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

  const storedDocument = useMemo(() => {
    if (!session) return EMPTY_SUMMARY_DOCUMENT
    if (session.summaryDocument) {
      return normalizeSummaryDocument(session.summaryDocument)
    }
    if (session.finalSummary) return summaryToDocument(session.finalSummary)
    return EMPTY_SUMMARY_DOCUMENT
  }, [session])
  const storedTitle = session?.summaryTitle.trim() || "Sermon notes"

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
      return
    }

    // This effect synchronizes the local editor buffer with the selected
    // persisted session. The values are intentionally stateful because users
    // can edit them without immediately saving the session.
    setEditorDocument(
      editorDocumentsRef.current.get(session.id) ?? storedDocument
    )
    setEditorTitle(editorTitlesRef.current.get(session.id) ?? storedTitle)
  }, [session, storedDocument, storedTitle])

  const refreshSummary = useCallback(
    async (force = false): Promise<void> => {
      if (!session || !aiConfigured || !hasEnoughTranscript) return
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
          generationId !== generationIdRef.current
        ) {
          return
        }

        const store = useSermonStore.getState()
        const currentSession =
          store.sessions.find((item) => item.id === store.selectedSessionId) ??
          store.sessions.at(-1)
        if (!currentSession || currentSession.id !== session.id) return

        lastSourceRef.current = sourceText
        lastGeneratedAtRef.current = Date.now()
        setLastGeneratedAt(lastGeneratedAtRef.current)
        setDraft(nextDraft)
        const nextAiDocument = normalizeSummaryDocument(
          summaryDocumentFromBullets(nextDraft.bullets)
        )
        const currentDocument =
          editorDocumentsRef.current.get(session.id) ??
          currentSession.summaryDocument ??
          (currentSession.finalSummary
            ? summaryToDocument(currentSession.finalSummary)
            : EMPTY_SUMMARY_DOCUMENT)
        const nextDocument = mergeSermonAiDraft(
          currentDocument,
          currentSession.summaryAiDraft,
          nextAiDocument
        )
        editorDocumentsRef.current.set(session.id, nextDocument)
        store.setAiSummaryDraft(
          session.id,
          nextDocument,
          nextAiDocument,
          nextDraft.title
        )
        const nextTitle =
          useSermonStore
            .getState()
            .sessions.find((item) => item.id === session.id)?.summaryTitle ??
          nextDraft.title
        editorTitlesRef.current.set(session.id, nextTitle)
        setEditorDocument(nextDocument)
        setEditorTitle(nextTitle)
      } catch (error: unknown) {
        if (
          controller.signal.aborted ||
          generationId !== generationIdRef.current
        ) {
          return
        }
        setGenerationError(
          error instanceof Error
            ? error.message
            : "Could not generate AI notes."
        )
      } finally {
        if (generationId === generationIdRef.current) {
          isGeneratingRef.current = false
          activeControllerRef.current = null
          setIsGenerating(false)
        }
      }
    },
    [aiConfigured, hasEnoughTranscript, session, sourceText]
  )

  const shouldGenerate =
    isActive || (session !== null && session.id === activeSessionId)
  const refreshSummaryRef = useRef(refreshSummary)
  useEffect(() => {
    refreshSummaryRef.current = refreshSummary
  }, [refreshSummary])
  useEffect(() => {
    if (!shouldGenerate) return
    const timer = window.setTimeout(() => {
      void refreshSummary().catch(() => undefined)
    }, 800)
    return () => window.clearTimeout(timer)
  }, [shouldGenerate, refreshSummary])

  useEffect(() => {
    if (!shouldGenerate) return
    const interval = window.setInterval(() => {
      void refreshSummaryRef.current().catch(() => undefined)
    }, SUMMARY_REFRESH_INTERVAL_MS)
    return () => window.clearInterval(interval)
  }, [shouldGenerate])

  useEffect(() => {
    return () => {
      generationIdRef.current += 1
      activeControllerRef.current?.abort()
      activeControllerRef.current = null
      isGeneratingRef.current = false
      setIsGenerating(false)
    }
  }, [session?.id, shouldGenerate, aiConfigured, aiModel, aiProvider])

  const markManualEdit = useCallback((sessionId: string) => {
    manualEditIdsRef.current.add(sessionId)
    setManualEditIds((current) => {
      if (current.has(sessionId)) return current
      return new Set([...current, sessionId])
    })
  }, [])

  const handleDocumentChange = useCallback(
    (document: AnnouncementDocument) => {
      if (!session) {
        useSermonStore.getState().setPendingSummaryDocument(document)
        setEditorDocument(document)
        return
      }
      markManualEdit(session.id)
      editorDocumentsRef.current.set(session.id, document)
      useSermonStore.getState().setSummaryDocument(session.id, document)
      setEditorDocument(document)
    },
    [markManualEdit, session]
  )

  const handleTitleChange = useCallback(
    (title: string) => {
      if (!session) {
        useSermonStore.getState().setPendingSummaryTitle(title)
        return
      }
      markManualEdit(session.id)
      editorTitlesRef.current.set(session.id, title)
      useSermonStore.getState().setSummaryTitle(session.id, title)
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
    if (!plainText && !draft && !hasStoredSummary) return

    const summary =
      draft && !hasManualEdits
        ? summaryFromAiDraft(draft)
        : (session.finalSummary ?? {
            overview: plainText,
            key_points: [],
            scriptures: [],
          })
    const title =
      editorTitle.trim() ||
      draft?.title.trim() ||
      session.summaryTitle ||
      "Sermon notes"
    const store = useSermonStore.getState()
    store.setSummaryTitle(session.id, title)
    store.setFinalSummary(session.id, summary, document)
    editorDocumentsRef.current.set(session.id, document)
    editorTitlesRef.current.set(session.id, title)
    manualEditIdsRef.current.delete(session.id)
    setManualEditIds((current) => {
      if (!current.has(session.id)) return current
      const next = new Set(current)
      next.delete(session.id)
      return next
    })
    setEditorDocument(document)
    setEditorTitle(title)
    toast.success("Sermon notes saved")
  }, [
    draft,
    editorDocument,
    editorTitle,
    hasManualEdits,
    hasStoredSummary,
    session,
  ])

  const showSummaryLive = useCallback(() => {
    const document = normalizeSummaryDocument(currentDocument)
    if (!announcementPlainText(document)) return
    const heading =
      currentTitle.trim() ||
      draft?.title.trim() ||
      session?.summaryTitle ||
      "Sermon notes"
    useBroadcastStore
      .getState()
      .presentOnLive(announcementDocumentToVerse(document, heading))
  }, [currentDocument, currentTitle, draft, session])

  const sendSummaryToNotes = useCallback(() => {
    const document = normalizeSummaryDocument(currentDocument)
    if (!announcementPlainText(document)) return
    const title =
      currentTitle.trim() ||
      draft?.title.trim() ||
      session?.summaryTitle ||
      "Sermon notes"
    useAnnouncementStore
      .getState()
      .addNoteFromDocument(SUMMARY_NOTES_SET, title, document)
    toast.success(`Added to Notes › ${SUMMARY_NOTES_SET}`)
  }, [currentDocument, currentTitle, draft, session])

  const hasSummaryContent = Boolean(announcementPlainText(currentDocument))
  const showFooter =
    hasSummaryContent || Boolean(session && hasManualEdits && hasStoredSummary)
  const aiLabel = isGenerating
    ? "Drafting…"
    : !aiConfigured
      ? "AI off"
      : generationError
        ? "AI draft failed"
        : draft
          ? "AI draft ready"
          : "AI draft pending"
  const aiHelp = !aiConfigured
    ? "Set up or unlock an AI key in Settings"
    : !session
      ? "Start a sermon to generate AI notes"
      : !hasEnoughTranscript
        ? "More transcript is needed for AI notes"
        : `Generate notes with ${aiProviderName} · ${aiModel}${lastGeneratedAt ? ` · Updated ${formatTime(lastGeneratedAt)}` : ""}`
  const handleAiClick = () => {
    if (!aiConfigured) {
      openSettings("ai-model")
      return
    }
    if (!session || !hasEnoughTranscript) {
      toast.info(aiHelp)
      return
    }
    void refreshSummary(true).catch(() => undefined)
  }

  return (
    <div className="@container/summary flex min-h-0 flex-1 flex-col">
      <SermonNotesHeader
        aiLabel={aiLabel}
        aiHelp={aiHelp}
        isGenerating={isGenerating}
        hasSessions={sessions.length > 0}
        showSessions={showSessions}
        onAiClick={handleAiClick}
        onToggleSessions={() => setShowSessions((current) => !current)}
      />
      {showSessions && session ? (
        <PreachingSummarySessionBar
          key={session.id}
          session={session}
          sessions={sessions}
        />
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 py-2">
        {generationError ? (
          <div
            role="alert"
            className="flex items-start justify-between gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
          >
            <AlertCircleIcon className="mt-0.5 size-3.5 shrink-0" />
            <p className="min-w-0 flex-1">{generationError}</p>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="-mt-1 -mr-1 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
              aria-label="Dismiss notes error"
              title="Dismiss error"
              onClick={() => setGenerationError(null)}
            >
              <XIcon className="size-3" />
            </Button>
          </div>
        ) : null}
        <Input
          value={currentTitle}
          className="h-10 text-sm"
          aria-label="Sermon notes title"
          onChange={(event) => handleTitleChange(event.target.value)}
          placeholder="Sermon title"
          maxLength={120}
        />
        <Suspense
          fallback={
            <div className="min-h-32 flex-1 animate-pulse bg-muted/40" />
          }
        >
          <AnnouncementEditor
            content={currentDocument}
            onChange={handleDocumentChange}
            contentLabel="Sermon notes content"
            placeholder="Write or paste your sermon outline here."
            isActive={isActive}
            fill
            compactToolbar
            seamless
          />
        </Suspense>
      </div>

      {showFooter ? (
        <div className="flex min-h-12 shrink-0 flex-wrap items-center gap-1 border-t border-border px-3 py-2">
          {session ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="px-1.5 @[21rem]/summary:px-2.5"
              aria-label="Save sermon notes"
              title="Save sermon notes"
              onClick={saveSummary}
            >
              <SaveIcon className="size-3.5" />
              <span className="hidden @[21rem]/summary:inline">Save</span>
            </Button>
          ) : null}
          {hasSummaryContent ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="px-1.5 @[21rem]/summary:px-2.5"
                aria-label="Send sermon notes to Notes"
                title="Send sermon notes to Notes"
                onClick={sendSummaryToNotes}
              >
                <NotebookTextIcon className="size-3.5" />
                <span className="hidden @[21rem]/summary:inline">Notes</span>
              </Button>
              <SendToOverlayButton
                label="the sermon notes"
                className="size-8 [&_svg]:size-3.5"
                getContent={() => ({
                  heading:
                    currentTitle.trim() ||
                    session?.summaryTitle ||
                    "Sermon notes",
                  text: announcementPlainText(
                    normalizeSummaryDocument(currentDocument)
                  ),
                  source: "text",
                })}
              />
            </>
          ) : null}
          {hasManualEdits ? (
            <span
              className="shrink-0 text-[0.625rem] text-muted-foreground"
              title="Unsaved changes"
            >
              <span className="sr-only">Unsaved changes</span>
              <span aria-hidden="true" className="@[26rem]/summary:hidden">
                •
              </span>
              <span
                aria-hidden="true"
                className="hidden @[26rem]/summary:inline"
              >
                Unsaved changes
              </span>
            </span>
          ) : null}
          {hasSummaryContent ? (
            <LiveActionButton
              action="show"
              className="ml-auto shrink"
              aria-label="Show sermon notes on Live"
              onClick={showSummaryLive}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
