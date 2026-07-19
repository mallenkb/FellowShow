export type AnnouncementMark = "bold" | "italic" | "underline"

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
}

export interface AnnouncementSet {
  id: string
  name: string
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
}
