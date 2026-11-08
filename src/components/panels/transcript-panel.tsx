import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { SermonTranscriptGap } from "@/components/panels/sermon-transcript-gap"
import { PanelHeader } from "@/components/ui/panel-header"
import { LevelMeter } from "@/components/ui/level-meter"
import { Button } from "@/components/ui/button"
import { SermonControl } from "@/components/controls/sermon-control"
import { MicIcon } from "lucide-react"
import {
  useAudioStore,
  useDetectionStore,
  useBroadcastStore,
  useQueueStore,
  useBibleStore,
  useSermonStore,
  useTranscriptStore,
} from "@/stores"
import { useTauriEvent } from "@/hooks/use-tauri-event"
import { useTranscription } from "@/hooks/use-transcription"
import { bibleActions } from "@/hooks/use-bible"
import { toVerseRenderData } from "@/hooks/use-broadcast"
import type { DetectionResult, ReadingAdvance, Verse } from "@/types"
import { bestSpokenScriptureMatch } from "@/lib/related-scriptures"
import { directChapterQuote } from "@/lib/chapter-quote-detection"
import {
  isDirectScriptureLoading,
  presentDirectDetection,
} from "@/lib/direct-scripture-live"
import { switchScriptureTranslation } from "@/lib/switch-scripture-translation"
import { toast } from "sonner"
import {
  createTranscriptHighlightMatcher,
  type TranscriptVerseAnnotation,
} from "@/lib/transcript-verse-highlights"
import {
  annotationFromAdvance,
  annotationFromDetection,
  annotationsForDirectDetection,
  annotationsFromSavedDetections,
  isHighlightedDetection,
  selectAnnotation,
} from "@/lib/transcript-annotations"
import type { TranscriptSegment } from "@/types"
import {
  activeTranslationAbbreviation,
  stageVerseInBackground,
} from "@/lib/preview-staging"
import { useAppNavigationStore } from "@/stores/app-navigation-store"
import { HighlightedTranscriptText } from "./transcript-highlighted-text"

const MAX_TRANSCRIPT_ANNOTATIONS = 120
const EMPTY_ANNOTATIONS: TranscriptVerseAnnotation[] = []
const EMPTY_SEGMENTS: TranscriptSegment[] = []
// Detection can finish after the transcript segment has already arrived.
const SEGMENT_ANNOTATION_GRACE_MS = 30_000

/**
 * Leaf component that subscribes to the audio level only. Isolated so the
 * high-frequency `audio_level` tick (many times per second during recording)
 * does NOT re-render the transcript list, connection dot, or button subtree.
 */
function AudioLevelMeter() {
  const rms = useAudioStore((s) => s.level.rms)
  return <LevelMeter level={rms} bars={6} />
}

/**
 * Leaf component that subscribes to `currentPartial`. Partials update per audio tick.
 */
function LivePartialLine({
  matchHighlights,
}: {
  matchHighlights: ReturnType<typeof createTranscriptHighlightMatcher>
}) {
  const currentPartial = useTranscriptStore((s) => s.currentPartial)

  if (!currentPartial) return null

  return (
    <HighlightedTranscriptText
      text={currentPartial}
      matchHighlights={matchHighlights}
      className="border-l-2 border-primary-emphasis pl-2 text-base leading-relaxed text-foreground"
      pulse
    />
  )
}

export function TranscriptPanel({ isVisible = true }: { isVisible?: boolean }) {
  const {
    segments: liveSegments,
    isTranscribing,
    connectionStatus,
    transition,
  } = useTranscription()
  const hasLivePartial = useTranscriptStore((s) => s.currentPartial.length > 0)
  const sermonTransition = useSermonStore((state) => state.transition)
  const activeSessionId = useSermonStore((state) => state.activeSessionId)
  const selectedSessionId = useSermonStore((state) => state.selectedSessionId)
  const sessions = useSermonStore((state) => state.sessions)
  const session = sessions.find(
    (item) => item.id === (activeSessionId ?? selectedSessionId)
  )
  const segments = useMemo(() => {
    if (!session) return liveSegments
    if (session.prepared) return EMPTY_SEGMENTS
    if (session.id === activeSessionId) {
      return liveSegments.slice(session.transcriptStartIndex)
    }
    return (
      session.transcriptSegments ??
      session.transcript.map((text, index) => ({
        id: `${session.id}-saved-${index}`,
        text,
        timestamp: session.startedAt,
        is_final: true,
        confidence: 0,
        words: [],
      }))
    )
  }, [session, activeSessionId, liveSegments])
  const showPartial = !session || session.id === activeSessionId
  const hasPartial = showPartial && hasLivePartial
  const isBusy = transition !== null || sermonTransition !== null
  const workspaceVisible = useAppNavigationStore(
    (state) => state.screen === "workspace"
  )
  const transcriptVisible = isVisible && workspaceVisible
  const connectionLabel =
    connectionStatus === "connecting"
      ? "Connecting…"
      : connectionStatus === "disconnected"
        ? "Reconnecting…"
        : connectionStatus === "error"
          ? "Connection error"
          : null
  const scrollRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const pendingDirectRef = useRef<{
    sessionId: string
    detection: DetectionResult
  } | null>(null)
  const shouldFollowTranscriptRef = useRef(true)
  const [isFollowingTranscript, setIsFollowingTranscript] = useState(true)
  const [annotationsBySession, setAnnotationsBySession] = useState<
    Record<string, TranscriptVerseAnnotation[]>
  >({})
  const currentAnnotations =
    annotationsBySession[session?.id ?? "unscoped"] ?? EMPTY_ANNOTATIONS
  const savedAnnotations = useMemo(
    () => annotationsFromSavedDetections(session?.scriptureDetections ?? []),
    [session?.scriptureDetections]
  )
  const matchHighlights = useMemo(
    () =>
      createTranscriptHighlightMatcher([
        ...currentAnnotations,
        ...savedAnnotations,
      ]),
    [currentAnnotations, savedAnnotations]
  )

  useEffect(
    () =>
      useSermonStore.subscribe((state, previous) => {
        const pending = pendingDirectRef.current
        if (!pending) return
        if (state.activeSessionId === pending.sessionId) {
          pendingDirectRef.current = null
          presentDirectDetection(pending.detection, pending.sessionId)
        } else if (
          previous.transition === "starting" &&
          state.transition !== "starting"
        ) {
          pendingDirectRef.current = null
        }
      }),
    []
  )

  const addTranscriptAnnotations = useCallback(
    (annotations: TranscriptVerseAnnotation[]) => {
      if (annotations.length === 0) return
      useTranscriptStore
        .getState()
        .addHighlightedScriptures(
          annotations.map((annotation) => annotation.reference)
        )
      const sermon = useSermonStore.getState()
      const owner =
        (sermon.transition === "starting"
          ? useDetectionStore.getState().sessionId
          : (sermon.activeSessionId ?? sermon.selectedSessionId)) ?? "unscoped"
      setAnnotationsBySession((current) => ({
        ...current,
        [owner]: [...annotations, ...(current[owner] ?? [])].slice(
          0,
          MAX_TRANSCRIPT_ANNOTATIONS
        ),
      }))
    },
    []
  )

  useTauriEvent<{ rms: number; peak: number }>("audio_level", (payload) => {
    useAudioStore.getState().setLevel(payload)
  })

  // Listen for voice translation commands: "read in NIV", "switch to ESV"
  useTauriEvent<{
    abbreviation: string
    translation_id: number
    verse?: Verse | null
    source?: "spoken" | "quote"
  }>("translation_command", (data) => {
    void switchScriptureTranslation(data.translation_id, {
      alreadySet: true,
      verse: data.verse,
    })
      .then(() => {
        if (
          data.source === "quote" &&
          useBibleStore.getState().activeTranslationId === data.translation_id
        ) {
          toast.info(`Detected ${data.abbreviation} from the quote`, {
            description: "Bible version updated.",
          })
        }
      })
      .catch((error: unknown) => {
        toast.error(`Could not switch to ${data.abbreviation}`, {
          description: String(error),
        })
      })
  })

  useTauriEvent<string>("translation_unavailable", (abbreviation) => {
    toast.warning(
      `Download ${abbreviation} in Settings to use this translation`
    )
  })

  // Listen for detection results from the backend (batch replaces previous detections)
  useTauriEvent<DetectionResult[]>("verse_detections", (detections) => {
    const sermon = useSermonStore.getState()
    const activeSession = sermon.sessions.find(
      (item) => item.id === sermon.activeSessionId
    )
    const previous = useDetectionStore.getState().detections
    const promoted = activeSession
      ? directChapterQuote(
          detections,
          useTranscriptStore
            .getState()
            .segments.slice(activeSession.transcriptStartIndex)
        )
      : null
    const isNewPromotion =
      promoted &&
      ![...previous, ...detections].some(
        (item) =>
          isHighlightedDetection(item) &&
          item.book_number === promoted.book_number &&
          item.chapter === promoted.chapter &&
          item.verse === promoted.verse
      )
    const allDetections =
      isNewPromotion && promoted ? [...detections, promoted] : detections
    useDetectionStore.getState().addDetections(allDetections)
    const highlightedDetections = allDetections.filter(isHighlightedDetection)
    const references = highlightedDetections
      .map((detection) => detection.verse_ref.trim())
      .filter(Boolean)
    if (references.length > 0) {
      useSermonStore.setState((state) => {
        const session = state.sessions.find(
          (item) => item.id === state.activeSessionId
        )
        if (!session) return state
        const existing = session.directScriptures ?? []
        const updated = [...new Set([...existing, ...references])]
        if (updated.length === existing.length) return state
        return {
          sessions: state.sessions.map((item) =>
            item.id === session.id
              ? {
                  ...item,
                  directScriptures: updated,
                  directScripturesIncomplete:
                    item.directScripturesIncomplete ??
                    item.directScriptures === undefined,
                }
              : item
          ),
        }
      })
    }
    addTranscriptAnnotations(
      highlightedDetections.flatMap(annotationsForDirectDetection)
    )

    // Auto-navigate book search + select verse for preview/live
    const directHit = highlightedDetections.at(-1)
    if (directHit && directHit.book_number > 0) {
      if (activeSession) {
        presentDirectDetection(directHit, activeSession.id)
      } else if (
        sermon.transition === "starting" &&
        useDetectionStore.getState().sessionId
      ) {
        const sessionId = useDetectionStore.getState().sessionId
        if (sessionId)
          pendingDirectRef.current = { sessionId, detection: directHit }
      } else {
        selectAnnotation(annotationFromDetection(directHit), false)
      }
    }

    // Strong word matches may fill an unattended Preview. They never replace
    // the explicit passage on Live or an operator's staged selection.
    if (
      !directHit &&
      activeSession &&
      !isDirectScriptureLoading(activeSession.id)
    ) {
      const match = bestSpokenScriptureMatch(detections)
      if (match)
        stageVerseInBackground({
          id: 0,
          translation_id:
            match.translation_id ??
            useBibleStore.getState().activeTranslationId,
          book_number: match.book_number,
          book_name: match.book_name,
          book_abbreviation: "",
          chapter: match.chapter,
          verse: match.verse,
          text: match.verse_text,
        })
    }

    // Automatic queue entries must come from the exact set rendered as
    // transcript highlights. Semantic matches remain available as detections,
    // but cannot guess their way into the operator's queue.
    for (const d of highlightedDetections) {
      if (d.auto_queued) {
        const queue = useQueueStore.getState()
        const dupIdx = queue.findDuplicate(d.book_number, d.chapter, d.verse)
        if (dupIdx !== -1) {
          const existing = queue.items[dupIdx]
          queue.flashItem(existing.id)
          queue.setActive(dupIdx)
          continue
        }
        queue.addItem({
          id: crypto.randomUUID(),
          verse: {
            id: 0,
            translation_id: useBibleStore.getState().activeTranslationId,
            book_number: d.book_number,
            book_name: d.book_name,
            book_abbreviation: "",
            chapter: d.chapter,
            verse: d.verse,
            verse_end: d.verse_end,
            verse_parts: d.verse_parts,
            text: d.verse_text,
          },
          reference: d.verse_ref,
          confidence: d.confidence,
          source: "direct",
          added_at: Date.now(),
        })
      }
    }
  })

  // Reading mode navigation: auto-navigate book panel when reading mode
  // advances to a new verse (chapter commands, verse commands, text matching).
  // Does NOT add to queue — only highlighted direct references feed the queue.
  useTauriEvent<ReadingAdvance>("reading_mode_verse", (advance) => {
    if (advance.book_number > 0) {
      addTranscriptAnnotations([annotationFromAdvance(advance)])
      const verse = {
        id: 0,
        translation_id: useBibleStore.getState().activeTranslationId,
        book_number: advance.book_number,
        book_name: advance.book_name,
        book_abbreviation: "",
        chapter: advance.chapter,
        verse: advance.verse,
        text: advance.verse_text,
      }
      bibleActions.selectVerse(verse)
      const broadcast = useBroadcastStore.getState()
      if (useSermonStore.getState().activeSessionId) {
        broadcast.presentOnLive(
          toVerseRenderData(verse, activeTranslationAbbreviation()),
          "preview"
        )
      } else {
        stageVerseInBackground(verse)
      }
      useBibleStore.getState().setPendingNavigation({
        activate: false,
        bookNumber: advance.book_number,
        chapter: advance.chapter,
        verse: advance.verse,
      })
    }
  })

  useEffect(() => {
    const viewport = scrollRef.current
    const content = contentRef.current
    if (!viewport || !content) return
    let frame = 0
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        if (shouldFollowTranscriptRef.current)
          viewport.scrollTop = viewport.scrollHeight
      })
    })
    observer.observe(content)
    observer.observe(viewport)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [])

  const handleTranscriptScroll = useCallback(() => {
    const element = scrollRef.current
    if (!element || !transcriptVisible || element.clientHeight === 0) return
    const isAtBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight <= 24
    shouldFollowTranscriptRef.current = isAtBottom
    setIsFollowingTranscript(isAtBottom)
  }, [transcriptVisible])

  const jumpToLatest = useCallback(() => {
    const element = scrollRef.current
    if (!element) return
    shouldFollowTranscriptRef.current = true
    setIsFollowingTranscript(true)
    element.scrollTop = element.scrollHeight
  }, [])

  useEffect(() => {
    if (!transcriptVisible) {
      shouldFollowTranscriptRef.current = true
      return
    }
    const frame = requestAnimationFrame(jumpToLatest)
    return () => cancelAnimationFrame(frame)
  }, [transcriptVisible, jumpToLatest])

  useEffect(() => {
    const followOnReturn = () => {
      if (transcriptVisible && !document.hidden) jumpToLatest()
    }
    window.addEventListener("focus", followOnReturn)
    document.addEventListener("visibilitychange", followOnReturn)
    return () => {
      window.removeEventListener("focus", followOnReturn)
      document.removeEventListener("visibilitychange", followOnReturn)
    }
  }, [transcriptVisible, jumpToLatest])

  return (
    <div
      data-slot="transcript-panel"
      className="flex flex-col overflow-hidden bg-card"
    >
      <PanelHeader
        title="Live transcript"
        icon={<MicIcon className="size-3" />}
      >
        <div className="flex items-end gap-2 pb-px">
          {isTranscribing && !isBusy && connectionLabel ? (
            <span role="status" className="text-xs text-muted-foreground">
              {connectionLabel}
            </span>
          ) : null}
          {isTranscribing && (
            <span
              className={`mb-1 size-1.5 rounded-full ${
                connectionStatus === "connected"
                  ? "bg-emerald-500"
                  : connectionStatus === "connecting"
                    ? "animate-pulse bg-amber-500"
                    : connectionStatus === "error"
                      ? "bg-red-500"
                      : "bg-muted-foreground/40"
              }`}
              title={connectionStatus}
            />
          )}
          <AudioLevelMeter />
        </div>
      </PanelHeader>

      <div className="relative min-h-0 flex-1">
        {!isFollowingTranscript && segments.length > 0 ? (
          <Button
            type="button"
            variant="secondary"
            size="xs"
            className="absolute top-2 right-2 z-20 shadow-sm"
            onClick={jumpToLatest}
          >
            Jump to latest
          </Button>
        ) : null}
        <div
          ref={scrollRef}
          onScroll={handleTranscriptScroll}
          onWheel={(event) => {
            if (
              event.deltaY < 0 &&
              event.currentTarget.scrollHeight >
                event.currentTarget.clientHeight
            ) {
              shouldFollowTranscriptRef.current = false
              setIsFollowingTranscript(false)
            }
          }}
          className="h-full [scrollbar-gutter:stable] overflow-y-auto overscroll-contain [overflow-anchor:none]"
        >
          <div ref={contentRef} className="flex flex-col gap-2 p-3">
            {/* Faded top gradient */}
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-6 bg-linear-to-b from-card to-transparent" />

            {segments.length === 0 && !hasPartial && !isTranscribing && (
              <p className="text-sm text-muted-foreground">
                Start a sermon to begin transcribing.
              </p>
            )}

            {/* Keep older transcript text readable while distinguishing recent speech. */}
            {segments.map((seg, idx) => {
              const distFromEnd = segments.length - 1 - idx
              const opacity =
                distFromEnd === 0
                  ? "text-foreground dark:text-foreground/80"
                  : distFromEnd === 1
                    ? "text-foreground/80 dark:text-foreground/60"
                    : distFromEnd <= 3
                      ? "text-muted-foreground dark:text-foreground/40"
                      : "text-muted-foreground dark:text-foreground/25"
              return (
                <Fragment key={seg.id}>
                  <SermonTranscriptGap
                    timestamp={seg.timestamp}
                    previousTimestamp={segments[idx - 1]?.timestamp}
                  />
                  <HighlightedTranscriptText
                    text={seg.text}
                    matchHighlights={matchHighlights}
                    latestAnnotationTime={
                      seg.timestamp + SEGMENT_ANNOTATION_GRACE_MS
                    }
                    className={`text-sm leading-relaxed transition-colors duration-300 ${opacity}`}
                  />
                </Fragment>
              )
            })}

            {/* Partial (in-progress) text rendered by leaf subscriber */}
            {showPartial ? (
              <LivePartialLine matchHighlights={matchHighlights} />
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex gap-2 px-3 py-2">
        <SermonControl />
      </div>
    </div>
  )
}
