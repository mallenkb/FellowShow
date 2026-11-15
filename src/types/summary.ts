export interface PreachingSummary {
  overview: string
  key_points: string[]
  scriptures: string[]
}

export type SermonSummaryLayout =
  | "theme-first"
  | "scripture-first"
  | "declarations-first"
  | "weekly-action-first"

export interface SermonReviewSummary {
  recap: string
  theme: string
  outline: string[]
  declarations: string[]
  assignment: string
}
