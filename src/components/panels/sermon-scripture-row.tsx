import { ListPlusIcon, PlayIcon, SquareIcon, Trash2Icon } from "lucide-react"
import { SendToOverlayButton } from "@/components/on-display/send-to-overlay"
import { verseContent } from "@/components/on-display/overlay-content"
import { Button } from "@/components/ui/button"
import type { SermonDirectReference } from "@/lib/sermon-direct-references"
import { cn } from "@/lib/utils"
import { scriptureRowStatusClasses } from "@/components/panels/content-row-styles"
import { ScriptureCardText } from "./scripture-card-text"
import { ScriptureStatusBadge } from "./scripture-status-badge"
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
  const status = isShowingLive ? "live" : isShowingPreview ? "in preview" : null

  return (
    <article
      data-slot="sermon-scripture-row"
      onDoubleClick={() => {
        void presentScripture(reference).catch((error: unknown) => {
          reportScriptureActionFailure(reference, error)
        })
      }}
      className={cn(
        "group flex min-w-0 items-start gap-2 rounded-lg border border-transparent px-3 py-3 transition-colors hover:bg-muted/40",
        scriptureRowStatusClasses(isShowingLive, isShowingPreview)
      )}
    >
      <button
        type="button"
        data-scripture-live-control
        aria-label={`Preview ${reference.reference}${status ? `, ${status}` : ""}`}
        title={`Preview ${reference.reference}. Double-click to show on Live.`}
        onClick={(event) => {
          if (event.detail > 1) return
          void previewScripture(reference).catch((error: unknown) => {
            reportScriptureActionFailure(reference, error)
          })
        }}
        className="min-w-0 flex-1 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="truncate text-xs font-semibold text-yellow-800 dark:text-yellow-300">
            {reference.reference}
          </span>
          <ScriptureStatusBadge status={status} />
        </span>
        <ScriptureCardText
          text={reference.verseText}
          bookNumber={reference.bookNumber}
          chapter={reference.chapter}
          verse={reference.verse}
          verseEnd={reference.verseEnd}
        />
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
          onClick={() => {
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
            onClick={() => {
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
          className="border-transparent bg-transparent shadow-none dark:border-transparent dark:bg-transparent"
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
          onClick={() => onRemove(reference)}
        >
          <Trash2Icon className="size-3" />
        </Button>
      </div>
    </article>
  )
}
