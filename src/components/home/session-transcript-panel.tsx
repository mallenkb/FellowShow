import {
  Fragment,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { PauseIcon, PlayIcon, SearchIcon } from "lucide-react"
import { SermonSessionTiming } from "@/components/controls/sermon-session-timing"
import { Button } from "@/components/ui/button"
import { SermonAudioDownload } from "./sermon-audio-download"
import { SermonBundleDownload } from "./sermon-bundle-download"
import { SermonTranscriptExport } from "./sermon-transcript-export"
import { useSermonAudio } from "./use-sermon-audio"
import { Input } from "@/components/ui/input"
import { TabsContent } from "@/components/ui/tabs"
import {
  formatSermonDuration,
  savedDirectScriptures,
  sermonGaps,
} from "@/lib/sermon-session"
import { spokenScriptureReferences } from "@/lib/scripture-format"
import { cn } from "@/lib/utils"
import type { SermonSession, TranscriptSegment } from "@/types"

function elapsedTimestamp(milliseconds: number) {
  const seconds = Math.floor(Math.max(0, milliseconds) / 1_000)
  const minutes = Math.floor(seconds / 60)
  const clock = `${String(minutes % 60).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`
  return minutes >= 60 ? `${Math.floor(minutes / 60)}:${clock}` : clock
}

function transcriptTimeline(session: SermonSession, lastTimestamp: number) {
  const spans = session.prepared
    ? []
    : session.recordingSpans?.length
      ? session.recordingSpans
      : [{ startedAt: session.startedAt, endedAt: session.endedAt }]
  let duration = 0
  const ranges = spans.map(({ startedAt, endedAt }) => {
    const end = Math.max(
      startedAt,
      endedAt ?? session.pausedAt ?? lastTimestamp
    )
    const offset = duration
    duration += end - startedAt
    return { startedAt, end, offset }
  })

  return {
    duration,
    positionAt(timestamp: number) {
      return ranges.reduce(
        (position, range) =>
          position +
          Math.max(0, Math.min(timestamp, range.end) - range.startedAt),
        0
      )
    },
    timestampAt(position: number) {
      const range = ranges.find(
        ({ startedAt, end, offset }) => position < offset + end - startedAt
      )
      return range
        ? range.startedAt + position - range.offset
        : (ranges.at(-1)?.end ?? session.startedAt)
    },
  }
}

function lineAtTime<T extends { timestamp: number }>(
  lines: T[],
  timestamp: number
) {
  for (let index = lines.length - 1; index >= 0; index--) {
    if (lines[index].timestamp <= timestamp) return lines[index]
  }
  return lines[0]
}

export function SessionTranscriptPanel({
  session,
  segments,
  isLive,
  transcriptVisible,
  children,
}: {
  session: SermonSession
  segments: TranscriptSegment[]
  isLive: boolean
  transcriptVisible: boolean
  children: ReactNode
}) {
  const [search, setSearch] = useState("")
  const [cursor, setCursor] = useState<number | null>(null)
  const directScriptureCount = useMemo(
    () => savedDirectScriptures(session).size,
    [session]
  )
  const timelineId = useId()
  const audioRef = useRef<HTMLAudioElement>(null)
  const lineElements = useRef(new Map<string | number, HTMLLIElement>())
  const query = search.trim().toLocaleLowerCase()
  const timeline = transcriptTimeline(
    session,
    Math.max(
      session.lastCheckpointAt ?? session.startedAt,
      segments.at(-1)?.timestamp ?? 0
    )
  )
  const timestamp = cursor ?? timeline.timestampAt(0)
  const position = cursor === null ? 0 : timeline.positionAt(cursor)
  const lines = useMemo(() => {
    const captured = segments.length
      ? segments.map(({ id, text, timestamp }) => ({ id, text, timestamp }))
      : session.transcript.map((text, index) => ({
          id: index,
          text,
          timestamp: undefined,
        }))
    // Format for display across segment boundaries without changing the saved
    // transcript or the timestamps used for audio navigation.
    const transcript = captured.map((line) => line.text).join("\n")
    const references = spokenScriptureReferences(transcript)
    let lineStart = 0
    let firstReference = 0
    const formatted: Array<
      (typeof captured)[number] & { displayText: string }
    > = []
    for (const line of captured) {
      const lineEnd = lineStart + line.text.length
      while (
        references[firstReference] &&
        references[firstReference].end <= lineStart
      )
        firstReference++
      let cursor = lineStart
      let displayText = ""
      for (
        let index = firstReference;
        index < references.length && references[index].start < lineEnd;
        index++
      ) {
        const reference = references[index]
        if (reference.start >= lineStart) {
          displayText +=
            transcript.slice(cursor, reference.start) + reference.text
        }
        cursor = Math.min(lineEnd, Math.max(cursor, reference.end))
      }
      displayText += transcript.slice(cursor, lineEnd)
      lineStart = lineEnd + 1
      formatted.push({ ...line, displayText })
    }
    return formatted
  }, [segments, session.transcript])
  const gaps = sermonGaps(session)
  const visible = query
    ? lines.filter(
        ({ text, displayText }) =>
          text.toLocaleLowerCase().includes(query) ||
          displayText.toLocaleLowerCase().includes(query)
      )
    : lines
  const timed = lines.filter(
    (line): line is typeof line & { timestamp: number } =>
      line.timestamp !== undefined
  )
  const playback = useSermonAudio(session.id, isLive, audioRef, setCursor)
  const current = lineAtTime(timed, timestamp)
  const currentId = current?.id

  useEffect(() => {
    if (transcriptVisible && playback.playing && currentId !== undefined) {
      lineElements.current.get(currentId)?.scrollIntoView({ block: "nearest" })
    }
  }, [transcriptVisible, playback.playing, currentId])
  function jumpToTimestamp(next: number) {
    setCursor(next)
    if (playback.hasAudio) playback.seek(next)
    const target = lineAtTime(
      timed.filter(
        (line) =>
          !query ||
          line.text.toLocaleLowerCase().includes(query) ||
          line.displayText.toLocaleLowerCase().includes(query)
      ),
      next
    )
    if (transcriptVisible && target) {
      lineElements.current.get(target.id)?.scrollIntoView({ block: "nearest" })
    }
  }

  return (
    <div className="mx-auto grid min-h-0 w-full max-w-6xl flex-1 scroll-pt-26 items-start gap-8 overflow-y-auto overscroll-contain px-4 py-6 sm:scroll-pt-16 sm:px-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:gap-12 lg:overflow-hidden lg:py-4">
      <aside className="min-w-0 space-y-4 lg:flex lg:h-full lg:flex-col lg:gap-4 lg:space-y-0 lg:overflow-y-auto lg:overscroll-contain">
        <div className="flex aspect-square max-w-[340px] flex-col justify-between overflow-hidden rounded-2xl bg-neutral-950 [background-image:radial-gradient(ellipse_at_100%_0%,#656023_0%,transparent_60%),radial-gradient(ellipse_at_0%_100%,#193b3d_0%,transparent_65%)] p-6 text-white lg:min-h-44">
          <div className="flex items-center gap-2 text-xs font-medium tracking-widest text-white/75 uppercase">
            <img
              src="/fellowshow-light.png"
              alt=""
              className="size-7 shrink-0 dark:hidden"
            />
            <img
              src="/fellowshow-dark.png"
              alt=""
              className="hidden size-7 shrink-0 dark:block"
            />
            FellowShow
          </div>
          <div>
            <p className="mb-2 text-xs font-medium tracking-widest text-primary uppercase">
              {session.series || "Saved sermon"}
            </p>
            <p className="line-clamp-4 text-3xl leading-tight font-semibold break-words">
              {session.title}
            </p>
            {session.speaker ? (
              <p className="mt-2 truncate text-sm text-white/75">
                {session.speaker}
              </p>
            ) : null}
          </div>
        </div>
        {session.endedAt !== null && !isLive ? (
          <SermonBundleDownload session={session} lines={lines} />
        ) : null}
        <div className="shrink-0 space-y-2">
          <label className="block text-sm font-medium" htmlFor={timelineId}>
            Transcript timeline
          </label>
          <input
            id={timelineId}
            type="range"
            min={0}
            max={Math.max(1, timeline.duration)}
            step="any"
            value={position}
            disabled={
              (!timed.length && !playback.hasAudio) || timeline.duration === 0
            }
            aria-valuetext={elapsedTimestamp(position)}
            className="w-full accent-primary-emphasis dark:accent-primary"
            onChange={(event) =>
              jumpToTimestamp(
                timeline.timestampAt(event.currentTarget.valueAsNumber)
              )
            }
          />
          <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
            <span>{elapsedTimestamp(position)}</span>
            <span>{elapsedTimestamp(timeline.duration)}</span>
          </div>
          {playback.hasAudio ? (
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <audio ref={audioRef} {...playback.audioEvents} />
              <Button size="sm" onClick={() => playback.toggle(timestamp)}>
                {playback.playing ? (
                  <PauseIcon aria-hidden="true" />
                ) : (
                  <PlayIcon aria-hidden="true" />
                )}
                {playback.playing ? "Pause" : "Play audio"}
              </Button>
              <SermonAudioDownload id={session.id} title={session.title} />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              {isLive
                ? "Audio is available after you pause or finish the sermon."
                : playback.loading
                  ? "Checking for saved audio…"
                  : playback.error
                    ? "Could not load this sermon's audio."
                    : "No audio recording was saved."}
            </p>
          )}
        </div>
        <div className="shrink-0 border-t border-border pt-4">
          <SermonSessionTiming
            session={session}
            directScriptureCount={directScriptureCount}
          />
        </div>
      </aside>
      <div className="flex min-h-0 min-w-0 flex-col self-stretch">
        <TabsContent
          value="transcript"
          forceMount
          className="flex min-h-0 flex-col gap-3 data-[state=inactive]:hidden"
        >
          <div className="sticky top-4 z-10 flex shrink-0 flex-wrap items-center gap-2 bg-card before:pointer-events-none before:absolute before:inset-x-0 before:bottom-full before:h-4 before:bg-card lg:static lg:before:hidden">
            <label className="relative block min-w-32 flex-1">
              <span className="sr-only">Search transcript</span>
              <SearchIcon
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search transcript"
                className="pl-9"
              />
            </label>
            {session.endedAt !== null && !isLive ? (
              <SermonTranscriptExport title={session.title} lines={lines} />
            ) : null}
          </div>
          <p
            className="shrink-0 text-xs text-muted-foreground"
            aria-live="polite"
          >
            {query ? `${visible.length} of ` : ""}
            {lines.length} {lines.length === 1 ? "segment" : "segments"}
          </p>
          {visible.length ? (
            <ol
              tabIndex={0}
              aria-label="Transcript segments"
              className="focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain"
            >
              {visible.map((line, index) => {
                const timestamp = line.timestamp
                const previous = visible[index - 1]?.timestamp
                const breaks =
                  query || timestamp === undefined
                    ? []
                    : gaps.filter(
                        (gap) =>
                          gap.endedAt <= timestamp &&
                          (previous === undefined || previous < gap.endedAt)
                      )

                return (
                  <Fragment key={line.id}>
                    {breaks.map((gap) => (
                      <li
                        key={gap.startedAt}
                        className="py-3 text-xs text-muted-foreground"
                      >
                        Listening resumed after{" "}
                        {formatSermonDuration(gap.endedAt - gap.startedAt)}{" "}
                        away. Nothing was transcribed during this break.
                      </li>
                    ))}
                    <li
                      ref={(element) => {
                        if (element) lineElements.current.set(line.id, element)
                        else lineElements.current.delete(line.id)
                      }}
                      aria-current={
                        current?.id === line.id ? "true" : undefined
                      }
                      className="flex items-baseline gap-4 py-3"
                    >
                      {timestamp === undefined ? null : (
                        <button
                          type="button"
                          aria-label={`Jump to ${elapsedTimestamp(timeline.positionAt(timestamp))}`}
                          className={cn(
                            "w-12 shrink-0 rounded text-left text-xs tabular-nums hover:underline focus-visible:outline-2 focus-visible:outline-ring",
                            playback.playing && currentId !== line.id
                              ? "text-muted-foreground"
                              : "text-primary-emphasis"
                          )}
                          onClick={() => jumpToTimestamp(timestamp)}
                        >
                          {elapsedTimestamp(timeline.positionAt(timestamp))}
                        </button>
                      )}
                      <span
                        className={cn(
                          "min-w-0 text-sm leading-relaxed break-words motion-safe:transition-colors",
                          playback.playing &&
                            (currentId === line.id
                              ? "font-semibold"
                              : "text-muted-foreground")
                        )}
                      >
                        {line.displayText}
                      </span>
                    </li>
                  </Fragment>
                )
              })}
            </ol>
          ) : (
            <p className="py-4 text-sm text-muted-foreground">
              {query
                ? "No transcript segments match your search."
                : "No transcript yet."}
            </p>
          )}
        </TabsContent>
        {children}
      </div>
    </div>
  )
}
