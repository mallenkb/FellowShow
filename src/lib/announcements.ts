import type {
  AnnouncementBlock,
  AnnouncementDocument,
  AnnouncementItem,
  AnnouncementMark,
  AnnouncementRenderData,
  AnnouncementRenderItem,
  AnnouncementSet,
  AnnouncementTextRun,
  BroadcastTheme,
  VerseRenderData,
} from "@/types"
import {
  resolveSlideBackground,
  sanitizeSlideBackground,
} from "@/lib/slide-background"

const EMPTY_ANNOUNCEMENT_DOCUMENT: AnnouncementDocument = {
  type: "doc",
  content: [{ type: "paragraph" }],
}

const ANNOUNCEMENT_NODE_TYPES: ReadonlySet<string> = new Set([
  "paragraph",
  "text",
  "hardBreak",
  "bulletList",
  "orderedList",
  "listItem",
])
const ANNOUNCEMENT_MARK_TYPES: ReadonlySet<string> = new Set([
  "bold",
  "italic",
  "underline",
])

type AnnouncementDocumentNode = AnnouncementDocument["content"][number]
type AnnouncementDocumentMarkNode = NonNullable<
  AnnouncementDocumentNode["marks"]
>[number]

function recordValue(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null
}

function marksFromNode(node: Record<string, unknown>): AnnouncementMark[] {
  if (!Array.isArray(node.marks)) return []
  const marks: AnnouncementMark[] = []
  for (const value of node.marks) {
    const mark = recordValue(value)?.type
    if (mark === "bold" || mark === "italic" || mark === "underline") {
      marks.push(mark)
    }
  }
  return marks
}

function runsFromContent(content: unknown): AnnouncementTextRun[] {
  if (!Array.isArray(content)) return []
  const runs: AnnouncementTextRun[] = []
  for (const value of content) {
    const node = recordValue(value)
    if (!node) continue
    if (node.type === "hardBreak") {
      runs.push({ text: "\n", marks: [] })
      continue
    }
    if (node.type === "text" && typeof node.text === "string") {
      runs.push({ text: node.text, marks: marksFromNode(node) })
    }
  }
  return runs
}

function blocksFromNodes(
  content: unknown,
  listKind?: "bullet" | "number"
): AnnouncementBlock[] {
  if (!Array.isArray(content)) return []
  const blocks: AnnouncementBlock[] = []
  for (const value of content) {
    const node = recordValue(value)
    if (!node) continue
    if (node.type === "paragraph" || node.type === "heading") {
      const runs = runsFromContent(node.content)
      if (runs.some((run) => run.text.trim())) {
        blocks.push({ kind: listKind ?? "paragraph", runs })
      }
      continue
    }
    if (node.type === "bulletList" || node.type === "orderedList") {
      blocks.push(
        ...blocksFromNodes(
          node.content,
          node.type === "bulletList" ? "bullet" : "number"
        )
      )
      continue
    }
    if (node.type === "listItem") {
      blocks.push(...blocksFromNodes(node.content, listKind))
    }
  }
  return blocks
}

function announcementBlocks(
  document: AnnouncementDocument
): AnnouncementBlock[] {
  return blocksFromNodes(document.content)
}

export function announcementPlainText(document: AnnouncementDocument): string {
  return announcementBlocks(document)
    .map((block) => block.runs.map((run) => run.text).join(""))
    .join("\n")
    .trim()
}

export function announcementDocumentToVerse(
  document: AnnouncementDocument,
  heading: string
): VerseRenderData {
  const blocks = announcementBlocks(document)
  return {
    reference: heading,
    themeSection: "announcements",
    segments: [{ text: announcementPlainText(document) }],
    announcement: {
      heading,
      pageNumber: 1,
      pageCount: 1,
      items: [{ number: 1, blocks }],
    },
    announcementSetName: heading,
  }
}

export function createAnnouncementItem(
  title = "New announcement"
): AnnouncementItem {
  return {
    id: crypto.randomUUID(),
    title,
    content: structuredClone(EMPTY_ANNOUNCEMENT_DOCUMENT),
  }
}

const DEFAULT_ANNOUNCEMENT_HEADING = "Announcements"
const MAX_HEADING_LENGTH = 120

export function createAnnouncementSet(
  name = "Sunday announcements"
): AnnouncementSet {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    name,
    heading: DEFAULT_ANNOUNCEMENT_HEADING,
    items: [createAnnouncementItem("Announcement 1")],
    createdAt: now,
    updatedAt: now,
  }
}

function renderItem(
  item: AnnouncementItem,
  number: number
): AnnouncementRenderItem {
  return { number, blocks: announcementBlocks(item.content) }
}

const SHOW_UNTIL_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function localDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

/** A note is expired the day after its show-until date, in local time. */
export function isAnnouncementExpired(
  item: AnnouncementItem,
  now: Date = new Date()
): boolean {
  return item.showUntil !== undefined && item.showUntil < localDateKey(now)
}

/** Every current note gets a slide of its own, shown one at a time. */
export function paginateAnnouncementSet(
  set: AnnouncementSet,
  now: Date = new Date()
): AnnouncementRenderData[] {
  // Numbers keep each note's position in the set, so expired notes leave gaps.
  const slides = set.items
    .map((item, index) => ({ item, render: renderItem(item, index + 1) }))
    .filter(
      ({ item, render }) =>
        render.blocks.length > 0 && !isAnnouncementExpired(item, now)
    )
  return slides.map(({ item, render }, index) => ({
    heading: item.title,
    pageNumber: index + 1,
    pageCount: slides.length,
    items: [render],
    ...(item.background ? { background: item.background } : {}),
  }))
}

/** Index of the page that shows the given item, or -1 while the item is empty. */
export function announcementPageIndexForItem(
  set: AnnouncementSet,
  pages: AnnouncementRenderData[],
  itemId: string
): number {
  const number = set.items.findIndex((item) => item.id === itemId) + 1
  if (number === 0) return -1
  return pages.findIndex((page) =>
    page.items.some((item) => item.number === number)
  )
}

export function announcementPageToVerse(
  set: AnnouncementSet,
  page: AnnouncementRenderData,
  themes: readonly BroadcastTheme[] = []
): VerseRenderData {
  const slideBackground = resolveSlideBackground(page.background, themes)
  return {
    ...(slideBackground ? { slideBackground } : {}),
    sourceId: page.pageNumber,
    reference: page.heading,
    themeSection: "announcements",
    segments: page.items.map((item) => ({
      text: item.blocks
        .map((block) => block.runs.map((run) => run.text).join(""))
        .join("\n"),
    })),
    announcement: page,
    announcementSetName: set.name,
    announcementItemIds: page.items.flatMap((item) => {
      const id = set.items[item.number - 1]?.id
      return id ? [id] : []
    }),
  }
}

/** One note with its own title, for Preview or Live. */
export function announcementItemToVerse(
  set: AnnouncementSet,
  itemId: string,
  themes: readonly BroadcastTheme[] = []
): VerseRenderData | null {
  const index = set.items.findIndex((item) => item.id === itemId)
  const item = set.items[index]
  if (!item) return null
  const render = renderItem(item, index + 1)
  if (render.blocks.length === 0) return null
  return announcementPageToVerse(
    set,
    {
      heading: item.title,
      pageNumber: 1,
      pageCount: 1,
      items: [render],
      ...(item.background ? { background: item.background } : {}),
    },
    themes
  )
}

export function sanitizeAnnouncementDocument(
  value: unknown
): AnnouncementDocument {
  const document = recordValue(value)
  if (document?.type !== "doc" || !Array.isArray(document.content)) {
    return structuredClone(EMPTY_ANNOUNCEMENT_DOCUMENT)
  }

  const content = document.content
    .map(sanitizeAnnouncementNode)
    .filter((node): node is AnnouncementDocumentNode => node !== null)
  return content.length > 0
    ? { type: "doc", content }
    : structuredClone(EMPTY_ANNOUNCEMENT_DOCUMENT)
}

function sanitizeAnnouncementNode(
  value: unknown
): AnnouncementDocumentNode | null {
  const node = recordValue(value)
  if (
    !node ||
    typeof node.type !== "string" ||
    !ANNOUNCEMENT_NODE_TYPES.has(node.type)
  ) {
    return null
  }

  const content = Array.isArray(node.content)
    ? node.content
        .map(sanitizeAnnouncementNode)
        .filter((child): child is AnnouncementDocumentNode => child !== null)
    : undefined
  const marks = Array.isArray(node.marks)
    ? node.marks
        .map((mark): AnnouncementDocumentMarkNode | null => {
          const candidate = recordValue(mark)
          return candidate &&
            typeof candidate.type === "string" &&
            ANNOUNCEMENT_MARK_TYPES.has(candidate.type)
            ? { type: candidate.type }
            : null
        })
        .filter((mark): mark is AnnouncementDocumentMarkNode => mark !== null)
    : undefined
  const start =
    node.type === "orderedList" ? recordValue(node.attrs)?.start : undefined
  const attrs =
    typeof start === "number" && Number.isSafeInteger(start) && start > 0
      ? { start }
      : undefined

  return {
    type: node.type,
    ...(attrs ? { attrs } : {}),
    ...(typeof node.text === "string" ? { text: node.text } : {}),
    ...(content && content.length > 0 ? { content } : {}),
    ...(marks && marks.length > 0 ? { marks } : {}),
  }
}

export function sanitizeAnnouncementSets(value: unknown): AnnouncementSet[] {
  if (!Array.isArray(value)) return []
  const sets: AnnouncementSet[] = []
  for (const entry of value) {
    const candidate = recordValue(entry)
    if (!candidate || typeof candidate.id !== "string") continue
    const rawItems = Array.isArray(candidate.items) ? candidate.items : []
    const items = rawItems.flatMap((raw, index): AnnouncementItem[] => {
      const item = recordValue(raw)
      if (!item || typeof item.id !== "string") return []
      const background = sanitizeSlideBackground(item.background)
      return [
        {
          id: item.id,
          title:
            typeof item.title === "string" && item.title.trim()
              ? item.title.trim()
              : `Announcement ${index + 1}`,
          content: sanitizeAnnouncementDocument(item.content),
          ...(background ? { background } : {}),
          ...(typeof item.showUntil === "string" &&
          SHOW_UNTIL_PATTERN.test(item.showUntil)
            ? { showUntil: item.showUntil }
            : {}),
        },
      ]
    })
    sets.push({
      id: candidate.id,
      name:
        typeof candidate.name === "string" && candidate.name.trim()
          ? candidate.name.trim()
          : "Announcements",
      heading:
        typeof candidate.heading === "string"
          ? candidate.heading.slice(0, MAX_HEADING_LENGTH)
          : DEFAULT_ANNOUNCEMENT_HEADING,
      items:
        items.length > 0 ? items : [createAnnouncementItem("Announcement 1")],
      createdAt:
        typeof candidate.createdAt === "number" ? candidate.createdAt : 0,
      updatedAt:
        typeof candidate.updatedAt === "number" ? candidate.updatedAt : 0,
    })
  }
  return sets
}
