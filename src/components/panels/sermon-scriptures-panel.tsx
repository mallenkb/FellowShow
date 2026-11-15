import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { Undo2Icon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  getSermonDirectReferences,
  type SermonDirectReference,
} from "@/lib/sermon-direct-references"
import { relatedScripturesForTranscript } from "@/lib/related-scriptures"
import { useRelatedScriptureReview } from "@/hooks/use-related-scripture-review"
import {
  useBroadcastStore,
  useBibleStore,
  useDetectionStore,
  useQueueStore,
  useSermonStore,
  useTranscriptStore,
} from "@/stores"
import { SermonScriptureRow } from "@/components/panels/sermon-scripture-row"
import { RelatedScripturesPanel } from "@/components/panels/related-scriptures-panel"
import type { ClearedScriptureQueue } from "@/stores/queue-store"
import type { DetectionResult, TranscriptSegment } from "@/types"
import { useAppNavigationStore } from "@/stores/app-navigation-store"

const EMPTY_DETECTIONS: DetectionResult[] = []
const EMPTY_SEGMENTS: TranscriptSegment[] = []
const EMPTY_REFERENCES: string[] = []

function scriptureKey(bookNumber: number, chapter: number, verse: number) {
  return `${bookNumber}:${chapter}:${verse}`
}

const SCRIPTURE_TAB_CLASS =
  "workspace-segment h-7 flex-none rounded-[calc(var(--workspace-nav-radius)_-_4px)] px-2.5 text-xs text-muted-foreground data-active:border-transparent data-active:bg-card data-active:text-secondary-foreground dark:data-active:border-transparent dark:data-active:bg-secondary dark:data-active:text-secondary-foreground group-data-[variant=default]/tabs-list:data-active:shadow-none"

export function SermonScripturesPanel({
  isActive = true,
}: {
  isActive?: boolean
}) {
  const [scriptureTab, setScriptureTab] = useState<"direct" | "related">(
    "direct"
  )
  const detections = useDetectionStore((state) => state.detections)
  const detectionSessionId = useDetectionStore((state) => state.sessionId)
  const segments = useTranscriptStore((state) => state.segments)
  const highlightedReferences = useTranscriptStore(
    (state) => state.highlightedScriptures
  )
  const queueItems = useQueueStore((state) => state.items)
  const activeSessionId = useSermonStore((state) => state.activeSessionId)
  const selectedSessionId = useSermonStore((state) => state.selectedSessionId)
  const viewingSessionId = activeSessionId ?? selectedSessionId
  const sessions = useSermonStore((state) => state.sessions)
  const books = useBibleStore((state) => state.books)
  const workspaceVisible = useAppNavigationStore(
    (state) => state.screen === "workspace"
  )
  const liveScriptureKey = useBroadcastStore((state) =>
    state.isLive ? (state.liveVerse?.scriptureKey ?? null) : null
  )
  const previewScriptureKey = useBroadcastStore(
    (state) => state.previewVerse?.scriptureKey ?? null
  )
  const [dismissed, setDismissed] = useState<{
    sessionId: string | null
    keys: ReadonlySet<string>
  }>({ sessionId: null, keys: new Set() })
  const [cleared, setCleared] = useState<{
    sessionId: string | null
    queue: ClearedScriptureQueue
    dismissedKeys: string[]
  } | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const dismissedKeys =
    dismissed.sessionId === viewingSessionId ? dismissed.keys : null
  const canUndoClear =
    cleared !== null && cleared.sessionId === viewingSessionId

  useEffect(
    () =>
      useSermonStore.subscribe((state, previous) => {
        if (
          (state.activeSessionId ?? state.selectedSessionId) !==
          (previous.activeSessionId ?? previous.selectedSessionId)
        )
          setCleared(null)
      }),
    []
  )

  const session = sessions.find((item) => item.id === viewingSessionId)
  const sessionSegments = useMemo(() => {
    if (!session || session.prepared) return EMPTY_SEGMENTS
    if (session.id === activeSessionId) {
      return segments.slice(session.transcriptStartIndex)
    }
    return session.transcriptSegments ?? EMPTY_SEGMENTS
  }, [session, activeSessionId, segments])
  const relatedDetections = session
    ? detectionSessionId === session.id
      ? detections
      : (session.scriptureDetections ?? EMPTY_DETECTIONS)
    : EMPTY_DETECTIONS
  const directDetections = session ? relatedDetections : detections
  const sessionHighlights =
    session && session.id !== activeSessionId
      ? (session.scriptures ?? EMPTY_REFERENCES)
      : highlightedReferences
  const directReferences = useMemo(
    () =>
      getSermonDirectReferences({
        detections: directDetections,
        highlightedReferences: sessionHighlights,
        transcriptSegments: session ? sessionSegments : segments,
        savedReferences: session?.directScriptures,
        books,
      }),
    [
      directDetections,
      sessionHighlights,
      session,
      sessionSegments,
      segments,
      books,
    ]
  )
  const relatedScriptures = useMemo(
    () => relatedScripturesForTranscript(relatedDetections, sessionSegments),
    [relatedDetections, sessionSegments]
  )
  const relatedReview = useRelatedScriptureReview({
    sessionId: session?.id ?? null,
    candidates: relatedScriptures.results,
    isActive:
      isActive && workspaceVisible && detectionSessionId === session?.id,
  })
  const queuedKeys = useMemo(
    () =>
      new Set(
        queueItems
          .filter((item) => item.verse.book_number > 0)
          .map((item) =>
            scriptureKey(
              item.verse.book_number,
              item.verse.chapter,
              item.verse.verse
            )
          )
      ),
    [queueItems]
  )
  const references = useMemo(() => {
    const combined = new Map(
      directReferences.map((reference) => [reference.key, reference])
    )
    for (const item of queueItems) {
      if (session) break
      if (item.verse.book_number <= 0 || item.source !== "direct") continue
      const key = scriptureKey(
        item.verse.book_number,
        item.verse.chapter,
        item.verse.verse
      )
      if (combined.has(key)) continue
      combined.set(key, {
        key,
        reference: item.reference,
        verseText: item.verse.text,
        bookName: item.verse.book_name,
        bookNumber: item.verse.book_number,
        chapter: item.verse.chapter,
        verse: item.verse.verse,
        verseEnd: item.verse.verse_end,
        verseParts: item.verse.verse_parts,
        confidence: item.confidence,
        transcriptSnippet: "",
        evidence: "direct-detection",
      })
    }
    return [...combined.values()].filter(
      (reference) =>
        !dismissedKeys?.has(reference.key) || queuedKeys.has(reference.key)
    )
  }, [directReferences, dismissedKeys, queueItems, queuedKeys, session])

  const removeScripture = (reference: SermonDirectReference) => {
    const queue = useQueueStore.getState()
    const index = queue.findDuplicate(
      reference.bookNumber,
      reference.chapter,
      reference.verse
    )
    if (index !== -1 && queue.items[index].source === "direct") {
      queue.removeItem(queue.items[index].id)
    }
    setCleared((previous) => {
      if (!previous || previous.sessionId !== viewingSessionId) return previous
      const removed = previous.queue.items.filter(
        (item) =>
          item.verse.book_number > 0 &&
          scriptureKey(
            item.verse.book_number,
            item.verse.chapter,
            item.verse.verse
          ) === reference.key
      )
      return {
        ...previous,
        dismissedKeys: previous.dismissedKeys.filter(
          (key) => key !== reference.key
        ),
        queue: {
          items: previous.queue.items.filter((item) => !removed.includes(item)),
          removedItemIds: previous.queue.removedItemIds.filter(
            (id) => !removed.some((item) => item.id === id)
          ),
          activeItemId: removed.some(
            (item) => item.id === previous.queue.activeItemId
          )
            ? null
            : previous.queue.activeItemId,
        },
      }
    })
    setDismissed((previous) => ({
      sessionId: viewingSessionId,
      keys: new Set([
        ...(previous.sessionId === viewingSessionId ? previous.keys : []),
        reference.key,
      ]),
    }))
  }

  const clearScriptures = () => {
    const queue = useQueueStore
      .getState()
      .clearScriptures(new Set(references.map((reference) => reference.key)))
    setCleared({
      sessionId: viewingSessionId,
      queue,
      dismissedKeys: directReferences
        .map((reference) => reference.key)
        .filter((key) => !dismissedKeys?.has(key)),
    })
    setDismissed((previous) => ({
      sessionId: viewingSessionId,
      keys: new Set([
        ...(previous.sessionId === viewingSessionId ? previous.keys : []),
        ...directReferences.map((reference) => reference.key),
      ]),
    }))
  }

  const undoClearScriptures = useCallback(() => {
    if (!cleared || cleared.sessionId !== viewingSessionId) return
    useQueueStore.getState().restoreScriptures(cleared.queue)
    setDismissed((previous) => {
      if (previous.sessionId !== cleared.sessionId) return previous
      const keys = new Set(previous.keys)
      for (const key of cleared.dismissedKeys) keys.delete(key)
      return { ...previous, keys }
    })
    setCleared(null)
  }, [viewingSessionId, cleared])

  useEffect(() => {
    if (!isActive || scriptureTab !== "direct" || !canUndoClear) return
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        event.altKey ||
        event.shiftKey ||
        (!event.metaKey && !event.ctrlKey) ||
        event.key.toLowerCase() !== "z"
      )
        return
      const target = event.target
      if (target instanceof Element) {
        if (
          target.closest(
            'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="dialog"], [role="alertdialog"]'
          )
        )
          return
        if (target !== document.body && !panelRef.current?.contains(target))
          return
      }
      event.preventDefault()
      undoClearScriptures()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [canUndoClear, isActive, scriptureTab, undoClearScriptures])

  return (
    <Tabs
      ref={panelRef}
      value={scriptureTab}
      onValueChange={(value) => {
        if (value === "direct" || value === "related") setScriptureTab(value)
      }}
      className="@container/scriptures min-h-0 flex-1 gap-0"
    >
      <div className="flex min-h-11 shrink-0 flex-wrap items-center justify-between gap-1 bg-surface-header px-3 py-[3px]">
        <h2 className="sr-only">Sermon scriptures</h2>
        <TabsList
          aria-label="Sermon scriptures"
          className="workspace-segment-track rounded-[var(--workspace-nav-radius)] border border-border bg-background p-[3px] [--workspace-nav-radius:10px]"
        >
          <TabsTrigger
            value="direct"
            aria-label={`Direct scriptures, ${references.length} ${references.length === 1 ? "verse" : "verses"}`}
            className={SCRIPTURE_TAB_CLASS}
          >
            <span>
              Direct
              <span className="hidden @[26rem]/scriptures:inline">
                {" "}
                scriptures
              </span>
            </span>
            <span className="font-normal text-muted-foreground">
              ({references.length})
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="related"
            aria-label={`Related scriptures, ${relatedReview.matches.length} ${relatedReview.matches.length === 1 ? "verse" : "verses"}`}
            className={SCRIPTURE_TAB_CLASS}
          >
            <span>
              Related
              <span className="hidden @[26rem]/scriptures:inline">
                {" "}
                scriptures
              </span>
            </span>
            <span className="font-normal text-muted-foreground">
              ({relatedReview.matches.length})
            </span>
          </TabsTrigger>
        </TabsList>
        {scriptureTab === "direct" ? (
          <div className="flex items-center gap-1">
            {canUndoClear ? (
              <Button
                type="button"
                variant="outline"
                size="xs"
                aria-label="Undo cleared scriptures"
                onClick={undoClearScriptures}
              >
                <Undo2Icon className="size-3" /> Undo
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="xs"
              aria-label="Clear sermon scriptures"
              disabled={references.length === 0}
              onClick={clearScriptures}
            >
              <XIcon className="size-3" /> Clear
            </Button>
          </div>
        ) : null}
      </div>
      <TabsContent
        value="direct"
        forceMount
        className="min-h-0 flex-1 overflow-y-auto px-3 py-2 data-[state=inactive]:hidden"
      >
        {references.length === 0 ? (
          <div className="flex min-h-full items-end py-2">
            <p className="text-xs leading-relaxed text-muted-foreground">
              Spoken scripture references appear here during a sermon.
            </p>
          </div>
        ) : (
          <div>
            {references.map((reference, index) => (
              <Fragment key={reference.key}>
                {index > 0 && (
                  <hr
                    aria-hidden="true"
                    className="scripture-card-divider mx-3 text-muted-foreground/35"
                  />
                )}
                <SermonScriptureRow
                  reference={reference}
                  isQueued={queuedKeys.has(reference.key)}
                  isShowingLive={liveScriptureKey === reference.key}
                  isShowingPreview={previewScriptureKey === reference.key}
                  onRemove={removeScripture}
                />
              </Fragment>
            ))}
          </div>
        )}
      </TabsContent>
      <TabsContent
        value="related"
        forceMount
        className="flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
      >
        <RelatedScripturesPanel
          sessionId={session?.id ?? null}
          matches={relatedReview.matches}
          hasTranscript={relatedScriptures.hasTranscript}
          reviewStatus={relatedReview.status}
          reviewError={relatedReview.error}
          onRetryReview={relatedReview.retry}
        />
      </TabsContent>
    </Tabs>
  )
}
