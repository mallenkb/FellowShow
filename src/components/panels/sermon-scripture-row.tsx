import {
  BookMarkedIcon,
  ListPlusIcon,
  PlayIcon,
  SquareIcon,
  Trash2Icon,
} from "lucide-react"
import { SendToOverlayButton } from "@/components/on-display/send-to-overlay"
import { verseContent } from "@/components/on-display/overlay-content"
import { Button } from "@/components/ui/button"
import { LIVE_STATUS_BADGE_CLASS } from "@/components/ui/live-status-styles"
import type { SermonDirectReference } from "@/lib/sermon-direct-references"
import { cn } from "@/lib/utils"
import { scriptureRowStatusClasses } from "@/components/panels/content-row-styles"
import {
  presentScripture,
  previewScripture,
  queueScripture,
  reportScriptureActionFailure,
  resolveScripture,
  stopScriptureOnLive,
} from "@/components/panels/sermon-scripture-actions"

export function SermonScriptureRow({
  reference,
  isQueued,
  isShowingLive,
  isShowingPreview,
  onRemove,
}: {
  reference: SermonDirectReference
  isQueued: boolean
  isShowingLive: boolean
  isShowingPreview: boolean
  onRemove: (reference: SermonDirectReference) => void
}) {
  return (
    <article
      data-slot="sermon-scripture-row"
      role="button"
      tabIndex={0}
      onClick={() => {
        void previewScripture(reference).catch((error: unknown) => {
          reportScriptureActionFailure(reference, error)
        })
      }}
      onDoubleClick={() => {
        void presentScripture(reference).catch((error: unknown) => {
          reportScriptureActionFailure(reference, error)
        })
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return
        event.preventDefault()
        void previewScripture(reference).catch((error: unknown) => {
          reportScriptureActionFailure(reference, error)
        })
      }}
      className={cn(
        "group cursor-pointer rounded-lg border border-transparent px-3 py-2 transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        scriptureRowStatusClasses(isShowingLive, isShowingPreview)
      )}
    >
      <div className="flex flex-wrap items-start gap-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-amber-400/15 text-amber-800 dark:text-amber-300">
          <BookMarkedIcon className="size-4" />
        </span>
        <div className="min-w-24 flex-1">
          <h3 className="truncate text-xs font-semibold text-foreground">
            {reference.reference}
          </h3>
          {reference.transcriptSnippet ? (
            <p className="mt-1 line-clamp-2 text-[0.625rem] leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">Transcript:</span> “
              {reference.transcriptSnippet}”
            </p>
          ) : null}
          {reference.verseText ? (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {reference.verseText}
            </p>
          ) : null}
        </div>
        {isShowingLive || isShowingPreview ? (
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[0.625rem] font-medium uppercase",
              isShowingLive
                ? LIVE_STATUS_BADGE_CLASS
                : "bg-blue-500/10 text-blue-700 dark:text-blue-300"
            )}
          >
            {isShowingLive ? "Live" : "In preview"}
          </span>
        ) : null}
        <div
          className="ml-auto flex shrink-0 items-center gap-0.5"
          onDoubleClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.stopPropagation()
            }
          }}
        >
          <Button
            type="button"
            data-scripture-live-control
            variant="ghost"
            size="icon-xs"
            title={
              isShowingLive
                ? "Stop showing " + reference.reference + " on Live"
                : "Show " + reference.reference + " full screen"
            }
            aria-label={
              isShowingLive
                ? "Stop showing " + reference.reference + " on Live"
                : "Show " + reference.reference + " full screen"
            }
            onClick={(event) => {
              event.stopPropagation()
              if (isShowingLive) {
                stopScriptureOnLive(reference)
                return
              }
              void presentScripture(reference).catch((error: unknown) => {
                reportScriptureActionFailure(reference, error)
              })
            }}
          >
            {isShowingLive ? (
              <SquareIcon className="size-3 text-destructive" />
            ) : (
              <PlayIcon className="size-3" />
            )}
          </Button>
          {!isQueued ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              title={"Add " + reference.reference + " to queue"}
              aria-label={"Add " + reference.reference + " to queue"}
              onClick={(event) => {
                event.stopPropagation()
                void queueScripture(reference).catch((error: unknown) => {
                  reportScriptureActionFailure(reference, error)
                })
              }}
            >
              <ListPlusIcon className="size-3" />
            </Button>
          ) : null}
          <SendToOverlayButton
            label={reference.reference}
            getContent={async () =>
              verseContent(await resolveScripture(reference))
            }
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            title={
              (isQueued ? "Remove " : "Dismiss ") +
              reference.reference +
              " from sermon scriptures"
            }
            aria-label={
              (isQueued ? "Remove " : "Dismiss ") +
              reference.reference +
              " from sermon scriptures"
            }
            onClick={(event) => {
              event.stopPropagation()
              onRemove(reference)
            }}
          >
            <Trash2Icon className="size-3" />
          </Button>
        </div>
      </div>
    </article>
  )
}
