import { Fragment, useState } from "react"
import { BookMarkedIcon } from "lucide-react"
import { RelatedScriptureRow } from "@/components/panels/related-scripture-row"
import { Button } from "@/components/ui/button"
import {
  MIN_RELATED_SCORE_PERCENT,
  type RelatedScriptureMatch,
  type RelatedScriptureReviewStatus,
} from "@/hooks/use-related-scripture-review"
import { detectionKey } from "@/lib/related-scriptures"
import { openSettings } from "@/lib/settings-dialog"
import { useBroadcastStore } from "@/stores"

export function RelatedScripturesPanel({
  sessionId,
  matches,
  hasTranscript,
  reviewStatus,
  reviewError,
  onRetryReview,
}: {
  sessionId: string | null
  matches: RelatedScriptureMatch[]
  hasTranscript: boolean
  reviewStatus: RelatedScriptureReviewStatus
  reviewError?: string
  onRetryReview: () => void
}) {
  const [selection, setSelection] = useState<{
    sessionId: string | null
    key: string
  } | null>(null)
  const liveScriptureKey = useBroadcastStore((state) =>
    state.isLive ? (state.liveVerse?.scriptureKey ?? null) : null
  )
  const previewScriptureKey = useBroadcastStore(
    (state) => state.previewVerse?.scriptureKey ?? null
  )
  const selected =
    matches.find(
      (match) =>
        selection?.sessionId === sessionId &&
        detectionKey(match.detection) === selection.key
    ) ?? matches[0]
  const cutoff = `${MIN_RELATED_SCORE_PERCENT}%`
  const hasLocalMatches = matches.some((match) => match.matchType === "local")
  const statusText =
    reviewStatus === "off"
      ? "Local scripture matches"
      : reviewStatus === "checking"
        ? "Reviewing local matches with OpenAI…"
        : reviewStatus === "ready"
          ? hasLocalMatches
            ? "Local matches and AI scores where available"
            : `Recent AI matches at ${cutoff} or higher, highest first`
          : reviewStatus === "missing-key"
            ? "Local scripture matches. A Decisions key is optional."
            : `${reviewError ?? "AI matching is unavailable."} Showing local matches.`

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-1 border-b border-border px-3 py-1.5">
        <span className="text-[0.6875rem] text-muted-foreground" role="status">
          {statusText}
        </span>
        <div className="flex items-center gap-1">
          {reviewStatus === "error" ? (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={onRetryReview}
            >
              Retry
            </Button>
          ) : null}
          {reviewStatus === "off" ||
          reviewStatus === "missing-key" ||
          reviewStatus === "error" ? (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => openSettings("ai-model")}
            >
              AI settings
            </Button>
          ) : null}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {!hasTranscript ? (
          <div className="flex min-h-full flex-col items-center justify-center gap-2 p-6 text-center">
            <div className="flex size-9 items-center justify-center rounded-md border border-border bg-muted/25 text-muted-foreground">
              <BookMarkedIcon className="size-4" />
            </div>
            <p className="text-xs text-muted-foreground">
              Suggested scriptures will appear as the sermon is transcribed.
            </p>
          </div>
        ) : matches.length === 0 ? (
          <div className="flex min-h-full items-center justify-center p-6 text-center text-xs text-muted-foreground">
            {reviewStatus === "ready"
              ? `No reviewed matches at ${cutoff} or higher yet.`
              : "No related scriptures found yet."}
          </div>
        ) : (
          <div>
            {matches.map((match, index) => {
              const key = detectionKey(match.detection)
              return (
                <Fragment key={key}>
                  {index > 0 && (
                    <hr
                      aria-hidden="true"
                      className="scripture-card-divider mx-3 text-muted-foreground/35"
                    />
                  )}
                  <RelatedScriptureRow
                    match={match}
                    selected={selected === match}
                    isShowingLive={liveScriptureKey === key}
                    isShowingPreview={previewScriptureKey === key}
                    onSelect={() => setSelection({ sessionId, key })}
                  />
                </Fragment>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
