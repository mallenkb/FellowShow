import { Fragment, type ReactNode } from "react"
import { announcementPlainText } from "@/lib/announcements"
import type { AnnouncementDocument, SermonSession } from "@/types"

type NoteNode = AnnouncementDocument["content"][number]

function renderNoteNodes(nodes: NoteNode[] | undefined): ReactNode {
  return nodes?.map((node, index) => {
    let content = renderNoteNodes(node.content)
    switch (node.type) {
      case "text":
        content = node.text
        for (const { type } of node.marks ?? []) {
          if (type === "bold") content = <strong>{content}</strong>
          if (type === "italic") content = <em>{content}</em>
          if (type === "underline") content = <u>{content}</u>
        }
        return <Fragment key={index}>{content}</Fragment>
      case "paragraph":
        return (
          <p key={index} className="whitespace-pre-wrap">
            {content}
          </p>
        )
      case "heading":
        return (
          <h3 key={index} className="font-medium">
            {content}
          </h3>
        )
      case "hardBreak":
        return <br key={index} />
      case "bulletList":
        return (
          <ul key={index} className="list-disc space-y-1.5 pl-5">
            {content}
          </ul>
        )
      case "orderedList":
        return (
          <ol
            key={index}
            start={
              typeof node.attrs?.start === "number"
                ? node.attrs.start
                : undefined
            }
            className="list-decimal space-y-1.5 pl-5"
          >
            {content}
          </ol>
        )
      case "listItem":
        return <li key={index}>{content}</li>
      default:
        return <Fragment key={index}>{content}</Fragment>
    }
  })
}

export function SavedWorkspaceSermonNotes({
  session,
}: {
  session: SermonSession
}) {
  const document = session.summaryDocument
  if (!document || !announcementPlainText(document)) {
    return (
      <p className="text-muted-foreground">No workspace sermon notes yet.</p>
    )
  }
  return (
    <article aria-label="Workspace sermon notes" className="space-y-3">
      <h2 className="text-lg font-semibold">
        {session.summaryTitle.trim() || session.title}
      </h2>
      <div className="space-y-3 leading-relaxed wrap-break-word">
        {renderNoteNodes(document.content)}
      </div>
    </article>
  )
}
