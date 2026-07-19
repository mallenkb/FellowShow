import { useCallback, useEffect, useRef, useState, type RefObject } from "react"
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
import {
  buildTranscriptHighlightParts,
  type TranscriptVerseAnnotation,
} from "@/lib/transcript-verse-highlights"
import type { TranscriptSegment } from "@/types"
import { endSermon } from "@/lib/sermon-actions"

const MAX_TRANSCRIPT_ANNOTATIONS = 120
const SEGMENT_ANNOTATION_GRACE_MS = 2_000

function annotationFromDetection(
  detection: DetectionResult
): TranscriptVerseAnnotation {
  return {
    id: `${detection.verse_ref}-${Date.now()}-${Math.random()}`,
    reference: detection.verse_ref,
    bookName: detection.book_name,
    bookNumber: detection.book_number,
    chapter: detection.chapter,
    verse: detection.verse,
    verseText: detection.verse_text,
    transcriptSnippet: detection.transcript_snippet,
    timestamp: Date.now(),
  }
}

function annotationFromAdvance(
  advance: ReadingAdvance
): TranscriptVerseAnnotation {
  return {
    id: `${advance.reference}-${Date.now()}-${Math.random()}`,
    reference: advance.reference,
    bookName: advance.book_name,
    bookNumber: advance.book_number,
    chapter: advance.chapter,
    verse: advance.verse,
    verseText: advance.verse_text,
    timestamp: Date.now(),
  }
}

function isHighlightedDetection(detection: DetectionResult): boolean {
  return (
    detection.source === "direct" &&
    detection.book_number > 0 &&
    detection.chapter > 0 &&
    detection.verse > 0 &&
    !detection.is_chapter_only
  )
}

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

function selectAnnotation(annotation: TranscriptVerseAnnotation) {
  bibleActions.selectVerse({
    id: 0,
    translation_id: useBibleStore.getState().activeTranslationId,
    book_number: annotation.bookNumber,
    book_name: annotation.bookName,
    book_abbreviation: "",
    chapter: annotation.chapter,
    verse: annotation.verse,
    text: annotation.verseText,
  })
  bibleActions.navigateToVerse(
    annotation.bookNumber,
    annotation.chapter,
    annotation.verse
  )
}

function HighlightedTranscriptText({
  text,
  annotations,
  className,
  pulse,
}: {
  text: string
  annotations: TranscriptVerseAnnotation[]
  className: string
  pulse?: boolean
}) {
  const parts = buildTranscriptHighlightParts(text, annotations)

  return (
    <p className={className}>
      {parts.map((part, index) => {
        if (part.type === "text") {
          return <span key={`${index}-text`}>{part.text}</span>
        }
        return (
          <button
            key={`${index}-${part.annotation.id}`}
            type="button"
            onClick={() => selectAnnotation(part.annotation)}
            className="mx-0.5 inline rounded-[6px] border border-yellow-500/35 bg-yellow-300/20 px-1.5 py-0.5 align-baseline text-[0.8125rem] leading-none font-semibold text-yellow-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] transition-colors hover:bg-yellow-300/30 focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:outline-none dark:text-yellow-100"
            title={`Load ${part.text}`}
          >
            {part.text}
          </button>
        )
      })}
      {pulse && (
        <span className="ml-1 inline-block size-1.5 animate-pulse rounded-full bg-primary align-middle" />
      )}
    </p>
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
  scrollRef,
  annotations,
}: {
  scrollRef: RefObject<HTMLDivElement | null>
  annotations: TranscriptVerseAnnotation[]
}) {
  const currentPartial = useTranscriptStore((s) => s.currentPartial)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [currentPartial, scrollRef])

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
    addTranscriptAnnotations(highlightedDetections.map(annotationFromDetection))

    // Auto-navigate book search + select verse for preview/live
    const directHit = highlightedDetections[0]
    if (directHit && directHit.book_number > 0) {
      // Select verse immediately so preview/live panels update
      bibleActions.selectVerse({
        id: 0,
        translation_id: useBibleStore.getState().activeTranslationId,
        book_number: directHit.book_number,
        book_name: directHit.book_name,
        book_abbreviation: "",
        chapter: directHit.chapter,
        verse: directHit.verse,
        text: directHit.verse_text,
      })
      // Navigate book search panel to this verse
      useBibleStore.getState().setPendingNavigation({
        bookNumber: directHit.book_number,
        chapter: directHit.chapter,
        verse: directHit.verse,
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
            text: d.verse_text,
          },
          reference: d.verse_ref,
          confidence: d.confidence,
          source: "ai-direct",
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
      bibleActions.selectVerse({
        id: 0,
        translation_id: useBibleStore.getState().activeTranslationId,
        book_number: advance.book_number,
        book_name: advance.book_name,
        book_abbreviation: "",
        chapter: advance.chapter,
        verse: advance.verse,
        text: advance.verse_text,
      })
      useBibleStore.getState().setPendingNavigation({
        bookNumber: advance.book_number,
        chapter: advance.chapter,
        verse: advance.verse,
      })
    }
  })

  // Auto-scroll on segment additions. Partial-driven scrolling lives in
  // LivePartialLine so the panel doesn't re-render per audio tick.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [segments])

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

      <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-2 p-3">
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
                annotations={annotationsForSegment(seg, transcriptAnnotations)}
                className={`text-sm leading-relaxed transition-colors duration-300 ${opacity}`}
              />
            )
          })}

          {/* Partial (in-progress) text rendered by leaf subscriber */}
          <LivePartialLine
            scrollRef={scrollRef}
            annotations={transcriptAnnotations}
          />
        </div>
      </div>

      <div className="flex gap-2 px-3 py-2">
        {isTranscribing ? (
          <Button
            variant="secondary"
            size="sm"
            className="bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive"
            onClick={() =>
              void (hasActiveSermon ? endSermon() : stopTranscription())
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
