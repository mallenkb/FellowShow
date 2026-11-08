import { BookOpenIcon } from "lucide-react"
import { ScriptureCardText } from "@/components/panels/scripture-card-text"
import { bibleBookNumberFromName } from "@/lib/bible-book-names"
import { formatScriptureReferences } from "@/lib/scripture-format"
import {
  savedDirectScriptures,
  savedScriptureReferenceKey,
} from "@/lib/sermon-session"
import type { DetectionResult, SermonSession } from "@/types"
import type { ScriptureDecisionType } from "@/types/detection"

const REVIEW_LABELS: Record<ScriptureDecisionType, string> = {
  quoted: "Quoted",
  paraphrased: "Paraphrased",
  allusion: "Biblical allusion",
  theme: "Related theme",
  unrelated: "Unrelated",
  uncertain: "Uncertain",
}

const VERSE_TEXT_CLASS = "block text-sm leading-relaxed text-foreground/85"

function SavedPassageText({
  reference,
  text = "",
}: {
  reference: string
  text?: string
}) {
  if (text.trim()) return <p className={VERSE_TEXT_CLASS}>{text}</p>

  const passage = /^(.+?)\s+(\d+)\s*:\s*(\d+)(?:\s*[-–—]\s*(\d+))?$/.exec(
    formatScriptureReferences(reference).trim()
  )
  const bookNumber = passage && bibleBookNumberFromName(passage[1])
  if (!passage || !bookNumber)
    return <p className={VERSE_TEXT_CLASS}>Verse text unavailable.</p>

  const [, , chapter, verse, verseEnd] = passage
  return (
    <ScriptureCardText
      className={VERSE_TEXT_CLASS}
      text=""
      bookNumber={bookNumber}
      chapter={Number(chapter)}
      verse={Number(verse)}
      verseEnd={verseEnd ? Number(verseEnd) : undefined}
    />
  )
}

function capturedScriptures(session: SermonSession) {
  const direct = savedDirectScriptures(session)
  const related = new Map<string, DetectionResult>()
  for (const detection of session.scriptureDetections ?? []) {
    if (detection.source === "direct" || detection.is_chapter_only) continue
    const reference = detection.verse_ref.trim()
    if (!reference) continue
    const key = savedScriptureReferenceKey(reference)
    if (!related.has(key)) related.set(key, detection)
  }
  const other = new Map<string, string>()
  for (const reference of [
    ...(session.scriptures ?? []),
    ...(session.finalSummary?.scriptures ?? []),
  ]) {
    const key = savedScriptureReferenceKey(reference)
    if (key && !direct.has(key) && !related.has(key)) other.set(key, reference)
  }
  return {
    direct: [...direct.values()],
    related: [...related.values()],
    other: [...other.values()],
  }
}

export function SessionScripturesPanel({
  session,
}: {
  session: SermonSession
}) {
  const { direct, related, other } = capturedScriptures(session)
  const isEmpty =
    direct.length === 0 && related.length === 0 && other.length === 0

  return (
    <section aria-label="Saved scriptures" className="space-y-6">
      <div>
        <h2 className="text-base font-medium">Scriptures</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Scriptures saved during this sermon.
        </p>
      </div>
      {isEmpty ? (
        <p className="py-4 text-sm text-muted-foreground">
          No scriptures were saved for this sermon.
        </p>
      ) : null}
      {direct.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Direct scriptures</h3>
          <ul className="space-y-2">
            {direct.map(({ reference, verseText }) => (
              <li
                key={savedScriptureReferenceKey(reference)}
                className="flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3"
              >
                <BookOpenIcon
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-primary-emphasis"
                />
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium break-words">{reference}</p>
                  <SavedPassageText reference={reference} text={verseText} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {related.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Related scriptures</h3>
          <ul className="space-y-2">
            {related.map((detection) => (
              <li
                key={savedScriptureReferenceKey(detection.verse_ref)}
                className="space-y-1.5 rounded-lg border border-border bg-card px-4 py-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">
                    {detection.verse_ref}
                  </span>
                  <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-xs font-medium text-sky-800 dark:text-sky-300">
                    {detection.review
                      ? REVIEW_LABELS[detection.review.type]
                      : "Word match"}
                  </span>
                </div>
                <ScriptureCardText
                  className={VERSE_TEXT_CLASS}
                  text={detection.verse_text}
                  bookNumber={detection.book_number}
                  chapter={detection.chapter}
                  verse={detection.verse}
                  verseEnd={detection.verse_end}
                />
                {detection.transcript_snippet ? (
                  <p className="text-sm leading-relaxed text-sky-800 dark:text-sky-300">
                    <span className="font-medium">Heard:</span> "
                    {detection.transcript_snippet}"
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {other.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Other saved scriptures</h3>
          <p className="text-sm text-muted-foreground">
            These references were saved without a match type.
          </p>
          <ul className="space-y-2">
            {other.map((reference) => (
              <li
                key={savedScriptureReferenceKey(reference)}
                className="flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3"
              >
                <BookOpenIcon
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-primary-emphasis"
                />
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium break-words">{reference}</p>
                  <SavedPassageText reference={reference} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
