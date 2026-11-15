import { Fragment, memo, useMemo, type KeyboardEvent } from "react"
import { selectAnnotation } from "@/lib/transcript-annotations"
import {
  type createTranscriptHighlightMatcher,
  type TranscriptVerseAnnotation,
} from "@/lib/transcript-verse-highlights"

function handleLiveShortcut(
  event: KeyboardEvent<HTMLButtonElement>,
  annotation: TranscriptVerseAnnotation
) {
  if (event.key !== "Enter" || !event.shiftKey) return
  event.preventDefault()
  selectAnnotation(annotation, true, true)
}

function TranscriptText({
  text,
  matchHighlights,
  latestAnnotationTime,
  className,
  pulse,
}: {
  text: string
  matchHighlights: ReturnType<typeof createTranscriptHighlightMatcher>
  latestAnnotationTime?: number
  className: string
  pulse?: boolean
}) {
  const parts = useMemo(
    () => matchHighlights(text, latestAnnotationTime),
    [text, matchHighlights, latestAnnotationTime]
  )

  return (
    <p className={className}>
      {parts.map((part, index) => {
        if (part.type === "text") {
          return <span key={`${index}-text`}>{part.text}</span>
        }
        if (part.type === "quote") {
          return (
            <Fragment key={`${index}-${part.annotation.id}`}>
              <button
                type="button"
                aria-keyshortcuts="Shift+Enter"
                onClick={(event) => {
                  if (event.detail <= 1) selectAnnotation(part.annotation)
                }}
                onDoubleClick={() =>
                  selectAnnotation(part.annotation, true, true)
                }
                onKeyDown={(event) =>
                  handleLiveShortcut(event, part.annotation)
                }
                className="inline rounded-[3px] text-inherit focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:outline-none"
                title={`Preview ${part.annotation.reference}; double-click or Shift+Enter to show on Live`}
              >
                <mark className="rounded-[3px] bg-yellow-300/25 box-decoration-clone px-0.5 text-yellow-950 dark:text-yellow-50">
                  {part.text}
                </mark>
              </button>
              <button
                type="button"
                aria-keyshortcuts="Shift+Enter"
                onClick={(event) => {
                  if (event.detail <= 1) selectAnnotation(part.annotation)
                }}
                onDoubleClick={() =>
                  selectAnnotation(part.annotation, true, true)
                }
                onKeyDown={(event) =>
                  handleLiveShortcut(event, part.annotation)
                }
                className="mx-0.5 inline rounded-[6px] border border-yellow-500/35 bg-yellow-300/20 px-1.5 py-0.5 align-baseline text-[0.8125rem] leading-none font-semibold text-yellow-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] transition-colors hover:bg-yellow-300/30 focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:outline-none dark:text-yellow-100"
                title={`Preview ${part.annotation.reference}; double-click or Shift+Enter to show on Live`}
              >
                {part.annotation.reference}
              </button>
            </Fragment>
          )
        }
        return (
          <button
            key={`${index}-${part.annotation.id}`}
            type="button"
            aria-keyshortcuts="Shift+Enter"
            onClick={(event) => {
              if (event.detail <= 1) selectAnnotation(part.annotation)
            }}
            onDoubleClick={() => selectAnnotation(part.annotation, true, true)}
            onKeyDown={(event) => handleLiveShortcut(event, part.annotation)}
            className="mx-0.5 inline rounded-[6px] border border-yellow-500/35 bg-yellow-300/20 px-1.5 py-0.5 align-baseline text-[0.8125rem] leading-none font-semibold text-yellow-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] transition-colors hover:bg-yellow-300/30 focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:outline-none dark:text-yellow-100"
            title={`Preview ${part.text}; double-click or Shift+Enter to show on Live`}
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

export const HighlightedTranscriptText = memo(TranscriptText)
