import type {
  AnnouncementBlock,
  AnnouncementDocument,
  AnnouncementItem,
  AnnouncementMark,
  AnnouncementRenderData,
  AnnouncementRenderItem,
  AnnouncementSet,
  AnnouncementTextRun,
  VerseRenderData,
} from "@/types"

const EMPTY_ANNOUNCEMENT_DOCUMENT: AnnouncementDocument = {
  type: "doc",
  content: [{ type: "paragraph" }],
}

const PAGE_CHARACTER_BUDGET = 520
const PAGE_ITEM_LIMIT = 5
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

export function createAnnouncementSet(
  name = "Sunday announcements"
): AnnouncementSet {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    name,
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

function itemWeight(item: AnnouncementRenderItem): number {
  return (
    item.blocks.reduce(
      (total, block) =>
        total + block.runs.reduce((sum, run) => sum + run.text.length, 0) + 28,
      0
    ) + 35
  )
}

export function paginateAnnouncementSet(
  set: AnnouncementSet
): AnnouncementRenderData[] {
  const renderItems = set.items
    .map((item, index) => renderItem(item, index + 1))
    .filter((item) => item.blocks.length > 0)
  if (renderItems.length === 0) return []

  const pages: AnnouncementRenderItem[][] = []
  let page: AnnouncementRenderItem[] = []
  let pageWeight = 0
  for (const item of renderItems) {
    const weight = itemWeight(item)
    if (
      page.length > 0 &&
      (page.length >= PAGE_ITEM_LIMIT ||
        pageWeight + weight > PAGE_CHARACTER_BUDGET)
    ) {
      pages.push(page)
      page = []
      pageWeight = 0
    }
    page.push(item)
    pageWeight += weight
  }
  if (page.length > 0) pages.push(page)

  return pages.map((items, index) => ({
    heading: "Announcements",
    pageNumber: index + 1,
    pageCount: pages.length,
    items,
  }))
}

export function announcementPageToVerse(
  set: AnnouncementSet,
  page: AnnouncementRenderData
): VerseRenderData {
  return {
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
  }
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

  return {
    type: node.type,
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
      return [
        {
          id: item.id,
          title:
            typeof item.title === "string" && item.title.trim()
              ? item.title.trim()
              : `Announcement ${index + 1}`,
          content: sanitizeAnnouncementDocument(item.content),
        },
      ]
    })
    sets.push({
      id: candidate.id,
      name:
        typeof candidate.name === "string" && candidate.name.trim()
          ? candidate.name.trim()
          : "Announcements",
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
