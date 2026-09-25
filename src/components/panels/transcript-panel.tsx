import { useCallback, useEffect, useRef, useState } from "react"
import { PanelHeader } from "@/components/ui/panel-header"
import { LevelMeter } from "@/components/ui/level-meter"
import { Button } from "@/components/ui/button"
import { ApiKeyPrompt } from "@/components/ui/api-key-prompt"
import { MicIcon, MicOffIcon } from "lucide-react"
import {
  useAudioStore,
  useDetectionStore,
  useQueueStore,
  useBibleStore,
  useSermonStore,
  useTranscriptStore,
} from "@/stores"
import { useTauriEvent } from "@/hooks/use-tauri-event"
import { useTranscription } from "@/hooks/use-transcription"
import { bibleActions } from "@/hooks/use-bible"
import type { DetectionResult, ReadingAdvance } from "@/types"
import type { TranscriptVerseAnnotation } from "@/lib/transcript-verse-highlights"
import {
  annotationFromAdvance,
  annotationFromDetection,
  isHighlightedDetection,
  isQuoteDetection,
  selectAnnotation,
} from "@/lib/transcript-annotations"
import type { TranscriptSegment } from "@/types"
import { endSermon } from "@/lib/sermon-actions"
import { stageVerseInBackground } from "@/lib/preview-staging"
import { HighlightedTranscriptText } from "./transcript-highlighted-text"

const MAX_TRANSCRIPT_ANNOTATIONS = 120
const SEGMENT_ANNOTATION_GRACE_MS = 2_000
function annotationsForSegment(
  segment: TranscriptSegment,
  annotations: TranscriptVerseAnnotation[]
) {
  return annotations.filter(
    (annotation) =>
      !annotation.timestamp ||
      annotation.timestamp <= segment.timestamp + SEGMENT_ANNOTATION_GRACE_MS
  )
}

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
  annotations,
}: {
  annotations: TranscriptVerseAnnotation[]
}) {
  const currentPartial = useTranscriptStore((s) => s.currentPartial)

  if (!currentPartial) return null

  return (
    <HighlightedTranscriptText
      text={currentPartial}
      annotations={annotations}
      className="border-l-2 border-primary pl-2 text-base leading-relaxed text-foreground"
      pulse
    />
  )
}

export function TranscriptPanel() {
  const [showKeyPrompt, setShowKeyPrompt] = useState(false)
  const onMissingApiKey = useCallback(() => setShowKeyPrompt(true), [])
  const {
    segments,
    isTranscribing,
    connectionStatus,
    startTranscription,
    stopTranscription,
  } = useTranscription({ onMissingApiKey })
  const hasPartial = useTranscriptStore((s) => s.currentPartial.length > 0)
  const hasActiveSermon = useSermonStore(
    (state) => state.activeSessionId !== null
  )
  const scrollRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const shouldFollowTranscriptRef = useRef(true)
  const [isFollowingTranscript, setIsFollowingTranscript] = useState(true)
  const [transcriptAnnotations, setTranscriptAnnotations] = useState<
    TranscriptVerseAnnotation[]
  >([])

  const addTranscriptAnnotations = useCallback(
    (annotations: TranscriptVerseAnnotation[]) => {
      if (annotations.length === 0) return
      useTranscriptStore
        .getState()
        .addHighlightedScriptures(
          annotations.map((annotation) => annotation.reference)
        )
      setTranscriptAnnotations((current) =>
        [...annotations, ...current].slice(0, MAX_TRANSCRIPT_ANNOTATIONS)
      )
    },
    []
  )

  // Quotes only mark the transcript. They never feed highlighted scriptures or the queue.
  const addQuoteAnnotations = useCallback(
    (annotations: TranscriptVerseAnnotation[]) => {
      if (annotations.length === 0) return
      const references = new Set(
        annotations.map((annotation) => annotation.reference)
      )
      setTranscriptAnnotations((current) =>
        [
          ...annotations,
          ...current.filter(
            (annotation) =>
              annotation.kind !== "quote" ||
              !references.has(annotation.reference)
          ),
        ].slice(0, MAX_TRANSCRIPT_ANNOTATIONS)
      )
    },
    []
  )

  useTauriEvent<{ rms: number; peak: number }>("audio_level", (payload) => {
    useAudioStore.getState().setLevel(payload)
  })

  // Listen for voice translation commands: "read in NIV", "switch to ESV"
  useTauriEvent<{ abbreviation: string; translation_id: number }>(
    "translation_command",
    (data) => {
      useBibleStore.getState().setActiveTranslation(data.translation_id)
      console.log(`[VOICE] Translation switched to ${data.abbreviation}`)
    }
  )

  // Listen for detection results from the backend (batch replaces previous detections)
  useTauriEvent<DetectionResult[]>("verse_detections", (detections) => {
    useDetectionStore.getState().addDetections(detections)
    const highlightedDetections = detections.filter(isHighlightedDetection)
    addTranscriptAnnotations(
      highlightedDetections.map((detection) =>
        annotationFromDetection(detection)
      )
    )
    addQuoteAnnotations(
      detections
        .filter(isQuoteDetection)
        .map((detection) => annotationFromDetection(detection, "quote"))
    )

    // Auto-navigate book search + select verse for preview/live
    const directHit = highlightedDetections[0]
    if (directHit && directHit.book_number > 0) {
      selectAnnotation(annotationFromDetection(directHit), false)
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
      stageVerseInBackground(verse)
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
    if (!element) return
    const isAtBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight <= 24
    shouldFollowTranscriptRef.current = isAtBottom
    setIsFollowingTranscript(isAtBottom)
  }, [])

  const jumpToLatest = useCallback(() => {
    const element = scrollRef.current
    if (!element) return
    shouldFollowTranscriptRef.current = true
    setIsFollowingTranscript(true)
    element.scrollTop = element.scrollHeight
  }, [])

  return (
    <div
      data-slot="transcript-panel"
      className="flex flex-col overflow-hidden rounded-lg border border-border bg-card"
    >
      <PanelHeader
        title="Live transcript"
        icon={<MicIcon className="size-3" />}
      >
        <div className="flex items-end gap-2 pb-px">
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
            if (event.deltaY < 0) {
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
                Click "Start transcribing" to begin
              </p>
            )}

            {/* Final segments — recent ones brighter, older ones fade */}
            {segments.map((seg, idx) => {
              const distFromEnd = segments.length - 1 - idx
              const opacity =
                distFromEnd === 0
                  ? "text-foreground/80"
                  : distFromEnd === 1
                    ? "text-foreground/60"
                    : distFromEnd <= 3
                      ? "text-foreground/40"
                      : "text-foreground/25"
              return (
                <HighlightedTranscriptText
                  key={seg.id}
                  text={seg.text}
                  annotations={annotationsForSegment(
                    seg,
                    transcriptAnnotations
                  )}
                  className={`text-sm leading-relaxed transition-colors duration-300 ${opacity}`}
                />
              )
            })}

            {/* Partial (in-progress) text rendered by leaf subscriber */}
            <LivePartialLine annotations={transcriptAnnotations} />
          </div>
        </div>
      </div>

      <div className="flex gap-2 px-3 py-2">
        {isTranscribing ? (
          <Button
            variant="destructive"
            size="sm"
            onClick={() =>
              void (hasActiveSermon ? endSermon() : stopTranscription()).catch(
                console.error
              )
            }
          >
            <MicIcon className="size-3" />
            {hasActiveSermon ? "Stop sermon" : "Stop transcribing"}
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void startTranscription()}
          >
            <MicOffIcon className="size-3" />
            Start transcribing
          </Button>
        )}
      </div>

      <ApiKeyPrompt
        open={showKeyPrompt}
        onOpenChange={setShowKeyPrompt}
        service="Deepgram"
        description="Live transcription needs a Deepgram API key. Add it in settings so the app can start listening."
      />
    </div>
  )
}
