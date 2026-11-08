import { ListPlusIcon, PlayIcon } from "lucide-react"
import { SendToOverlayButton } from "@/components/on-display/send-to-overlay"
import { verseContent } from "@/components/on-display/overlay-content"
import { Button } from "@/components/ui/button"
import { scriptureRowStatusClasses } from "@/components/panels/content-row-styles"
import {
  presentRelatedScripture,
  previewRelatedScripture,
  queueRelatedScripture,
  reportRelatedScriptureFailure,
  resolveRelatedScripture,
} from "@/components/panels/related-scripture-actions"
import type { RelatedScriptureMatch } from "@/hooks/use-related-scripture-review"
import { cn } from "@/lib/utils"
import { ScriptureCardText } from "./scripture-card-text"
import { ScriptureStatusBadge } from "./scripture-status-badge"

const MATCH_LABELS: Record<RelatedScriptureMatch["matchType"], string> = {
  quoted: "Quoted",
  paraphrased: "Paraphrased",
  allusion: "Biblical allusion",
  theme: "Related theme",
  local: "Local match",
}

export function RelatedScriptureRow({
  match,
  selected,
  isShowingLive,
  isShowingPreview,
  onSelect,
}: {
  match: RelatedScriptureMatch
  selected: boolean
  isShowingLive: boolean
  isShowingPreview: boolean
  onSelect: () => void
}) {
  const { detection } = match
  const status = isShowingLive ? "live" : isShowingPreview ? "in preview" : null
  const label = MATCH_LABELS[match.matchType]
  const scoreLabel =
    match.matchType === "local"
      ? null
      : `${Number((match.score * 100).toFixed(2))}%`

  return (
    <article
      onDoubleClick={() => {
        onSelect()
        void presentRelatedScripture(detection).catch((error: unknown) =>
          reportRelatedScriptureFailure(detection, error)
        )
      }}
      className={cn(
        "group flex min-w-0 items-start gap-2 rounded-lg border border-transparent px-3 py-3 transition-colors hover:bg-muted/40",
        selected && !isShowingLive && !isShowingPreview && "bg-muted/50",
        scriptureRowStatusClasses(isShowingLive, isShowingPreview)
      )}
    >
      <button
        type="button"
        data-scripture-live-control
        aria-label={`Preview ${detection.verse_ref}, ${scoreLabel ? `AI relevance score ${scoreLabel}` : label}${status ? `, ${status}` : ""}`}
        aria-pressed={selected}
        title={`Preview ${detection.verse_ref}. Double-click to show on Live.`}
        onClick={(event) => {
          if (event.detail > 1) return
          onSelect()
          void previewRelatedScripture(detection).catch((error: unknown) =>
            reportRelatedScriptureFailure(detection, error)
          )
        }}
        className="min-w-0 flex-1 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="truncate text-xs font-semibold text-sky-800 dark:text-sky-300">
            {detection.verse_ref}
          </span>
          <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[0.625rem] font-medium text-sky-800 dark:text-sky-300">
            {label}
          </span>
          {scoreLabel ? (
            <span
              title="AI relevance score"
              className="text-[0.625rem] font-medium text-sky-800 tabular-nums dark:text-sky-300"
            >
              {scoreLabel}
            </span>
          ) : null}
          <ScriptureStatusBadge status={status} />
        </span>
        <ScriptureCardText
          text={detection.verse_text}
          bookNumber={detection.book_number}
          chapter={detection.chapter}
          verse={detection.verse}
          verseEnd={detection.verse_end}
        />
        <span className="mt-2 block text-[0.6875rem] leading-relaxed text-sky-800 dark:text-sky-300">
          <span className="font-medium">Heard:</span> “
          {detection.transcript_snippet}”
        </span>
      </button>
      <div
        className="flex shrink-0 items-center gap-0.5"
        onDoubleClick={(event) => event.stopPropagation()}
      >
        <Button
          type="button"
          data-scripture-live-control
          variant="ghost"
          size="icon-xs"
          title={`Show ${detection.verse_ref} on Live`}
          aria-label={`Show ${detection.verse_ref} on Live`}
          onClick={() => {
            void presentRelatedScripture(detection).catch((error: unknown) =>
              reportRelatedScriptureFailure(detection, error)
            )
          }}
        >
          <PlayIcon className="size-3" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          title={`Add ${detection.verse_ref} to queue`}
          aria-label={`Add ${detection.verse_ref} to queue`}
          onClick={() => {
            void queueRelatedScripture(detection).catch((error: unknown) =>
              reportRelatedScriptureFailure(detection, error)
            )
          }}
        >
          <ListPlusIcon className="size-3" />
        </Button>
        <SendToOverlayButton
          label={detection.verse_ref}
          getContent={async () =>
            verseContent(await resolveRelatedScripture(detection))
          }
          className="border-transparent bg-transparent shadow-none dark:border-transparent dark:bg-transparent"
        />
      </div>
    </article>
  )
}
