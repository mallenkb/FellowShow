import { bibleBookNumberFromName } from "@/lib/bible-book-names"
import { formatScriptureReferences } from "@/lib/scripture-format"
import {
  savedDirectScriptures,
  savedScriptureReferenceKey,
} from "@/lib/sermon-session"
import { getSessionNotes } from "@/lib/sermon-summary-text"
import type { SermonSession } from "@/types"
import type { SermonReviewSummary, SermonSummaryLayout } from "@/types/summary"

export const SUMMARY_LAYOUTS = [
  { value: "theme-first", label: "Theme first" },
  { value: "scripture-first", label: "Scripture first" },
  { value: "declarations-first", label: "Declarations first" },
  { value: "weekly-action-first", label: "Weekly action first" },
] as const satisfies readonly { value: SermonSummaryLayout; label: string }[]

export function parseSummaryLayout(
  value: unknown
): SermonSummaryLayout | undefined {
  return SUMMARY_LAYOUTS.find((layout) => layout.value === value)?.value
}

export function parseReviewSummary(value: unknown): SermonReviewSummary | null {
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  const clean = (item: unknown, limit: number) =>
    typeof item === "string"
      ? formatScriptureReferences(item.trim().slice(0, limit))
      : ""
  const list = (items: unknown) =>
    Array.isArray(items)
      ? [
          ...new Set(items.map((item) => clean(item, 280)).filter(Boolean)),
        ].slice(0, 8)
      : []
  const recap = clean(record.recap, 650)
  const outline = list(record.outline)
  if (!recap || !outline.length) return null
  return {
    recap,
    theme: clean(record.theme, 280),
    outline,
    declarations: list(record.declarations),
    assignment: clean(record.assignment, 500),
  }
}

type SectionKey = keyof SermonReviewSummary | "scriptures"

const SECTION_ORDER: Record<SermonSummaryLayout, SectionKey[]> = {
  "theme-first": [
    "theme",
    "recap",
    "outline",
    "declarations",
    "scriptures",
    "assignment",
  ],
  "scripture-first": [
    "scriptures",
    "theme",
    "recap",
    "outline",
    "declarations",
    "assignment",
  ],
  "declarations-first": [
    "recap",
    "declarations",
    "scriptures",
    "assignment",
    "theme",
    "outline",
  ],
  "weekly-action-first": [
    "assignment",
    "theme",
    "outline",
    "recap",
    "declarations",
    "scriptures",
  ],
}

const SECTION_LABELS: Record<SectionKey, string> = {
  recap: "Short recap",
  theme: "Theme",
  outline: "Sermon outline",
  declarations: "Declarations",
  scriptures: "Scriptures",
  assignment: "Assignment for the week",
}

function summaryScriptures(session: SermonSession): string[] {
  const direct = [...savedDirectScriptures(session).values()].map(
    ({ reference }) => reference
  )
  const related = new Set(
    (session.scriptureDetections ?? [])
      .filter(({ source }) => source !== "direct")
      .map(({ verse_ref }) => savedScriptureReferenceKey(verse_ref))
  )
  const candidates = direct.length
    ? direct
    : [
        ...(session.finalSummary?.scriptures ?? []),
        ...(session.scriptures ?? []),
      ].filter(
        (reference) => !related.has(savedScriptureReferenceKey(reference))
      )
  const references = new Map<string, string>()
  for (const candidate of candidates) {
    const reference = formatScriptureReferences(candidate).trim()
    const match =
      /^(.+?)\s+\d+(?:\s*:\s*\d+(?:\s*[-–—]\s*\d+)?(?:\s*,\s*\d+)*)?$/.exec(
        reference
      )
    if (match && bibleBookNumberFromName(match[1])) {
      references.set(savedScriptureReferenceKey(reference), reference)
    }
  }
  return [...references.values()]
}

export function getSermonSummaryView(
  session: SermonSession,
  notes = getSessionNotes(session)
) {
  const layout = session.summaryLayout ?? "theme-first"
  const legacy =
    notes.summaryLines.length > 0
      ? {
          recap: notes.summaryLines[0],
          outline: [
            ...notes.summaryLines.slice(1),
            ...notes.overview,
            ...notes.points,
          ],
        }
      : { recap: notes.overview.join(" "), outline: notes.points }
  const content = {
    ...(session.reviewSummary ?? {
      ...legacy,
      theme: "",
      declarations: [],
      assignment: "",
    }),
    scriptures: summaryScriptures(session),
  }
  const sections = SECTION_ORDER[layout].flatMap((key) => {
    const value = content[key]
    if (!value.length) return []
    return [
      {
        key,
        label:
          layout === "weekly-action-first" && key === "outline"
            ? "Key points"
            : SECTION_LABELS[key],
        value,
      },
    ]
  })
  const savedTitle = session.summaryTitle.trim()
  return {
    layout,
    title:
      savedTitle && savedTitle !== "Sermon notes" ? savedTitle : session.title,
    sections,
  }
}

export function formatSermonSummaryExport(session: SermonSession): string {
  const { title, sections } = getSermonSummaryView(session)
  if (!sections.length) return ""
  return (
    [
      title,
      ...sections.map(({ key, label, value }) => {
        const body =
          typeof value === "string"
            ? value
            : value
                .map((line, index) =>
                  key === "declarations" ? `${index + 1}. ${line}` : `- ${line}`
                )
                .join("\n")
        return `${label}\n${body}`
      }),
    ].join("\n\n") + "\n"
  )
}
