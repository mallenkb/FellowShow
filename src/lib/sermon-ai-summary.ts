import { requestAiJson } from "@/lib/ai-provider"

export const MIN_SUMMARY_TRANSCRIPT_CHARACTERS = 180
export const SUMMARY_REFRESH_INTERVAL_MS = 45_000

const MAX_TRANSCRIPT_CHARACTERS = 14_000
const FALLBACK_TITLE = "Sermon Summary"

export interface SermonAiSummary {
  title: string
  bullets: string[]
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null
}

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim().slice(0, maxLength)
    : ""
}

function sourceFallbackBullets(transcript: string): string[] {
  const sentences = transcript
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => cleanText(sentence, 220))
    .filter((sentence) => sentence.length >= 12)

  if (sentences.length >= 3) return sentences.slice(0, 5)

  const words = transcript.split(/\s+/).filter(Boolean)
  if (words.length < 3) return sentences
  const chunkSize = Math.max(1, Math.ceil(words.length / 3))
  return Array.from({ length: 3 }, (_, index) =>
    cleanText(
      words.slice(index * chunkSize, (index + 1) * chunkSize).join(" "),
      220
    )
  ).filter(Boolean)
}

function parseSummary(
  value: unknown,
  transcript: string
): SermonAiSummary | null {
  const record = asRecord(value)
  if (!record) return null

  const title = cleanText(record.title, 100) || FALLBACK_TITLE
  const modelBullets = Array.isArray(record.bullets)
    ? record.bullets
        .map((bullet) => cleanText(bullet, 220))
        .filter(Boolean)
    : []
  const bullets = [
    ...new Set([...modelBullets, ...sourceFallbackBullets(transcript)]),
  ].slice(0, 5)

  return bullets.length > 0 ? { title, bullets } : null
}

function transcriptForModel(transcript: string): string {
  if (transcript.length <= MAX_TRANSCRIPT_CHARACTERS) return transcript
  const headLength = 1_500
  return `${transcript.slice(0, headLength)}\n[…]\n${transcript.slice(
    -(MAX_TRANSCRIPT_CHARACTERS - headLength)
  )}`
}

export async function generateSermonSummary(
  transcript: string,
  signal?: AbortSignal
): Promise<SermonAiSummary> {
  const normalizedTranscript = transcript
    .replace(/\s+/g, " ")
    .trim()
  const modelTranscript = transcriptForModel(normalizedTranscript)

  return requestAiJson<SermonAiSummary>(
    {
      signal,
      temperature: 0.2,
      maxTokens: 600,
      messages: [
        {
          role: "system",
          content:
            "You create faithful sermon or meeting slide summaries. Use only the supplied transcript. Return JSON with exactly two fields: title (a concise title; use a title explicitly spoken by the preacher when present, otherwise create a neutral fallback) and bullets (exactly 3 to 5 concise, digestible bullet strings). Do not add facts, interpretations, scripture references, or advice that are not supported by the transcript. Keep each bullet to one sentence and keep the whole result suitable for one presentation slide.",
        },
        {
          role: "user",
          content: `Transcript:\n${modelTranscript}`,
        },
      ],
    },
    (value) => parseSummary(value, modelTranscript)
  )
}
