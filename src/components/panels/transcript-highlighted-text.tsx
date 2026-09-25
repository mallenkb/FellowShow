import { Fragment } from "react"
import { selectAnnotation } from "@/lib/transcript-annotations"
import {
  buildTranscriptHighlightParts,
  type TranscriptVerseAnnotation,
} from "@/lib/transcript-verse-highlights"

export function HighlightedTranscriptText({
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
        if (part.type === "quote") {
          return (
            <Fragment key={`${index}-${part.annotation.id}`}>
              <mark className="rounded-[3px] bg-sky-400/25 box-decoration-clone px-0.5 text-sky-950 dark:bg-sky-400/25 dark:text-sky-50">
                {part.text}
              </mark>
              <button
                type="button"
                onClick={() => selectAnnotation(part.annotation)}
                className="mx-0.5 inline rounded-[6px] border border-sky-500/35 bg-sky-400/15 px-1.5 py-0.5 align-baseline text-[0.8125rem] leading-none font-semibold text-sky-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] transition-colors hover:bg-sky-400/25 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none dark:text-sky-100"
                title={`Load ${part.annotation.reference} (quoted)`}
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
