import {
  announcementPlainText,
  sanitizeAnnouncementDocument,
} from "@/lib/announcements"
import type { AnnouncementDocument } from "@/types"

export function summaryDocumentFromBullets(
  bullets: readonly string[]
): AnnouncementDocument {
  return {
    type: "doc",
    content: [
      {
        type: "bulletList",
        content: bullets.map((bullet) => ({
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: bullet }],
            },
          ],
        })),
      },
    ],
  }
}

/** Replace only the unchanged AI block, preserving the operator's edits. */
export function mergeSermonAiDraft(
  current: AnnouncementDocument,
  previous: AnnouncementDocument | null | undefined,
  next: AnnouncementDocument
): AnnouncementDocument {
  const document = sanitizeAnnouncementDocument(current)
  const nextDraft = sanitizeAnnouncementDocument(next)
  const previousNode = previous
    ? sanitizeAnnouncementDocument(previous).content[0]
    : undefined
  const content = [...document.content]
  let previousIndex = -1
  if (previousNode) {
    const previousJson = JSON.stringify(previousNode)
    for (let index = content.length - 1; index >= 0; index -= 1) {
      if (JSON.stringify(content[index]) === previousJson) {
        previousIndex = index
        break
      }
    }
  }

  if (previousIndex >= 0) {
    content.splice(previousIndex, 1, ...nextDraft.content)
  } else if (announcementPlainText(document).trim()) {
    content.push({ type: "paragraph" }, ...nextDraft.content)
  } else {
    return nextDraft
  }
  return sanitizeAnnouncementDocument({ type: "doc", content })
}
