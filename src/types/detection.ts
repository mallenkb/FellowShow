type ScriptureMatchType = "quoted" | "paraphrased" | "allusion" | "theme"
export type ScriptureDecisionType =
  ScriptureMatchType | "unrelated" | "uncertain"

export interface ScriptureReview {
  type: ScriptureDecisionType
  relevance: number
}

export interface DetectionResult {
  verse_ref: string
  verse_text: string
  book_name: string
  book_number: number
  chapter: number
  verse: number
  verse_end?: number | null
  verse_parts?: { verse: number; text: string }[]
  translation_id?: number
  confidence: number
  source: "direct" | "semantic"
  auto_queued: boolean
  transcript_snippet: string
  /** True when detected from a chapter-only reference (verse defaults to 1, may be refined). */
  is_chapter_only: boolean
  /** Review of this exact verse text and spoken excerpt, when available. */
  review?: ScriptureReview
}

export interface ReadingAdvance {
  book_number: number
  book_name: string
  chapter: number
  verse: number
  verse_text: string
  reference: string
  confidence: number
}

export interface SemanticSearchResult {
  verse_ref: string
  verse_text: string
  book_name: string
  book_number: number
  chapter: number
  verse: number
  similarity: number
}
