export type AnnouncementMark = "bold" | "italic" | "underline"

/** A slide's own background. Missing means the announcements theme's. */
export type SlideBackgroundChoice =
  | { type: "solid"; color: string }
  | { type: "theme"; themeId: string }
  | {
      type: "media"
      url: string
      mediaType: "image" | "video"
      /** "contain" shows the whole picture; default "cover" fills the screen. */
      fit?: "cover" | "contain"
      opacity?: number
      scale?: number
      offsetX?: number
      offsetY?: number
    }

export interface AnnouncementTextRun {
  text: string
  marks: AnnouncementMark[]
}

export interface AnnouncementBlock {
  kind: "paragraph" | "bullet" | "number"
  runs: AnnouncementTextRun[]
}

interface AnnouncementDocumentMarkNode {
  type: string
  attrs?: Record<string, unknown>
}

interface AnnouncementDocumentNode {
  type?: string
  attrs?: Record<string, unknown>
  content?: AnnouncementDocumentNode[]
  marks?: AnnouncementDocumentMarkNode[]
  text?: string
}

export interface AnnouncementDocument {
  type: "doc"
  content: AnnouncementDocumentNode[]
}

export interface AnnouncementItem {
  id: string
  title: string
  content: AnnouncementDocument
  /** Last day to show this note, as YYYY-MM-DD. Missing means every week. */
  showUntil?: string
  /** A note with its own background is always shown on its own page. */
  background?: SlideBackgroundChoice
}

export interface AnnouncementSet {
  id: string
  name: string
  /** Legacy set-wide heading, retained for saved-data compatibility. */
  heading: string
  items: AnnouncementItem[]
  createdAt: number
  updatedAt: number
}

export interface AnnouncementRenderItem {
  number: number
  blocks: AnnouncementBlock[]
}

export interface AnnouncementRenderData {
  heading: string
  pageNumber: number
  pageCount: number
  items: AnnouncementRenderItem[]
  background?: SlideBackgroundChoice
}

export type GivingNetwork =
  "mtn-momo" | "telecel-cash" | "airteltigo-money" | "bank"

export interface GivingAccount {
  id: string
  network: GivingNetwork
  /** Merchant ID, wallet number, or bank account number. */
  number: string
}

/** The church's payment details, shown as the offering slide each service. */
export interface GivingDetails {
  heading: string
  accounts: GivingAccount[]
  accountName: string
  reference: string
  background?: SlideBackgroundChoice
}
