import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Undo2Icon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  getSermonDirectReferences,
  type SermonDirectReference,
} from "@/lib/sermon-direct-references"
import { relatedScripturesForTranscript } from "@/lib/related-scriptures"
import {
  useBroadcastStore,
  useDetectionStore,
  useQueueStore,
  useSermonStore,
  useTranscriptStore,
} from "@/stores"
import { SermonScriptureRow } from "@/components/panels/sermon-scripture-row"
import { RelatedScripturesPanel } from "@/components/panels/related-scriptures-panel"
import type { ClearedScriptureQueue } from "@/stores/queue-store"

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
  const segments = useTranscriptStore((state) => state.segments)
  const highlightedReferences = useTranscriptStore(
    (state) => state.highlightedScriptures
  )
  const queueItems = useQueueStore((state) => state.items)
  const activeSessionId = useSermonStore((state) => state.activeSessionId)
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
    dismissed.sessionId === activeSessionId ? dismissed.keys : null
  const canUndoClear = cleared !== null && cleared.sessionId === activeSessionId

  useEffect(
    () =>
      useSermonStore.subscribe((state, previous) => {
        if (state.activeSessionId !== previous.activeSessionId) setCleared(null)
      }),
    []
  )

  const directReferences = useMemo(
    () =>
      getSermonDirectReferences({
        detections,
        highlightedReferences,
        transcriptSegments: segments,
      }),
    [detections, highlightedReferences, segments]
  )
  const relatedScriptures = useMemo(
    () => relatedScripturesForTranscript(detections, segments),
    [detections, segments]
  )
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
  }, [directReferences, dismissedKeys, queueItems, queuedKeys])

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
      if (!previous || previous.sessionId !== activeSessionId) return previous
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
      sessionId: activeSessionId,
      keys: new Set([
        ...(previous.sessionId === activeSessionId ? previous.keys : []),
        reference.key,
      ]),
    }))
  }

  const clearScriptures = () => {
    const queue = useQueueStore
      .getState()
      .clearScriptures(new Set(references.map((reference) => reference.key)))
    setCleared({
      sessionId: activeSessionId,
      queue,
      dismissedKeys: directReferences
        .map((reference) => reference.key)
        .filter((key) => !dismissedKeys?.has(key)),
    })
    setDismissed((previous) => ({
      sessionId: activeSessionId,
      keys: new Set([
        ...(previous.sessionId === activeSessionId ? previous.keys : []),
        ...directReferences.map((reference) => reference.key),
      ]),
    }))
  }

  const undoClearScriptures = useCallback(() => {
    if (!cleared || cleared.sessionId !== activeSessionId) return
    useQueueStore.getState().restoreScriptures(cleared.queue)
    setDismissed((previous) => {
      if (previous.sessionId !== cleared.sessionId) return previous
      const keys = new Set(previous.keys)
      for (const key of cleared.dismissedKeys) keys.delete(key)
      return { ...previous, keys }
    })
    setCleared(null)
  }, [activeSessionId, cleared])

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
            aria-label={`Related scriptures, ${relatedScriptures.results.length} ${relatedScriptures.results.length === 1 ? "verse" : "verses"}`}
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
              ({relatedScriptures.results.length})
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
          <div className="space-y-1.5">
            {references.map((reference) => (
              <SermonScriptureRow
                key={reference.key}
                reference={reference}
                isQueued={queuedKeys.has(reference.key)}
                isShowingLive={liveScriptureKey === reference.key}
                isShowingPreview={previewScriptureKey === reference.key}
                onRemove={removeScripture}
              />
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
          results={relatedScriptures.results}
          hasTranscript={relatedScriptures.hasTranscript}
          bestMatchKey={relatedScriptures.bestMatchKey}
        />
      </TabsContent>
    </Tabs>
  )
}
