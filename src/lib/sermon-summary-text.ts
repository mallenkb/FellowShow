import { announcementPlainText } from "@/lib/announcements"
import type { SermonSession } from "@/types"

function noteKey(text: string): string {
  const normalized = text.trim().normalize("NFC").toLowerCase()
  return (
    normalized
      .replace(/['’]/g, "")
      .replace(/[^\p{L}\p{M}\p{N}]+/gu, " ")
      .trim() || normalized
  )
}

function uniqueNotes<T>(
  items: readonly T[],
  textOf: (item: T) => string,
  covered: readonly string[] = []
): T[] {
  const seen = new Set(covered.map(noteKey))
  const coveredText = [...seen].map((key) => ` ${key} `).join("\n")
  return items.filter((item) => {
    const key = noteKey(textOf(item))
    if (!key || seen.has(key)) return false
    if (key.includes(" ") && coveredText.includes(` ${key} `)) return false
    seen.add(key)
    return true
  })
}

export function getSessionNotes(session: SermonSession) {
  const savedSummary = session.summaryDocument
    ? announcementPlainText(session.summaryDocument)
    : ""
  const summaryLines = uniqueNotes(savedSummary.split("\n"), (line) => line)
  const overview = uniqueNotes(
    [session.finalSummary?.overview ?? ""],
    (line) => line,
    summaryLines
  )
  const points = uniqueNotes(
    session.finalSummary?.key_points ?? [],
    (point) => point,
    [...summaryLines, ...overview]
  )
  const captured = uniqueNotes(session.notes, (note) => note.text, [
    ...summaryLines,
    ...overview,
    ...points,
  ])
  return { summaryLines, overview, points, captured }
}
