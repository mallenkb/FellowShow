import { useRef, useState, type ReactNode } from "react"
import { CheckIcon, PencilIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { useSermonStore } from "@/stores"
import type { SermonSession } from "@/types"

function formatSessionTimestamp(timestamp: number) {
  return new Date(timestamp).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export function PreachingSummarySessionBar({
  session,
  sessions,
  children,
}: {
  session: SermonSession | null
  sessions: SermonSession[]
  children?: ReactNode
}) {
  const [isRenaming, setIsRenaming] = useState(false)
  const [titleDraft, setTitleDraft] = useState(session?.title ?? "")
  const cancelRenameRef = useRef(false)

  const saveTitle = () => {
    if (!cancelRenameRef.current && session && titleDraft.trim()) {
      useSermonStore
        .getState()
        .updateSessionTitle(session.id, titleDraft.trim())
    }
    cancelRenameRef.current = false
    setIsRenaming(false)
  }

  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
      {isRenaming && session ? (
        <Input
          autoFocus
          value={titleDraft}
          aria-label="Sermon session title"
          className="h-8 min-w-0 flex-1 text-xs"
          onChange={(event) => setTitleDraft(event.target.value)}
          onBlur={saveTitle}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur()
            if (event.key === "Escape") {
              cancelRenameRef.current = true
              setIsRenaming(false)
            }
          }}
        />
      ) : (
        <Select
          value={session?.id ?? ""}
          onValueChange={(value) =>
            useSermonStore.getState().selectSession(value)
          }
          disabled={sessions.length === 0}
        >
          <SelectTrigger
            size="sm"
            className="min-w-0 flex-1 text-xs"
            aria-label="Sermon session"
          >
            <span className="min-w-0 truncate">
              {session?.title ?? "No sermons yet"}
            </span>
          </SelectTrigger>
          <SelectContent position="popper" align="start">
            {[...sessions].reverse().map((candidate) => (
              <SelectItem
                key={candidate.id}
                value={candidate.id}
                textValue={candidate.title}
              >
                <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                  <span className="min-w-0 truncate">{candidate.title}</span>
                  <span className="shrink-0 text-[0.625rem] text-muted-foreground">
                    {formatSessionTimestamp(candidate.startedAt)}
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {session ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={isRenaming ? "Save sermon name" : "Rename sermon"}
          title={isRenaming ? "Save sermon name" : "Rename sermon"}
          onMouseDown={
            isRenaming ? (event) => event.preventDefault() : undefined
          }
          onClick={() => {
            if (isRenaming) saveTitle()
            else {
              cancelRenameRef.current = false
              setTitleDraft(session.title)
              setIsRenaming(true)
            }
          }}
        >
          {isRenaming ? (
            <CheckIcon className="size-3" />
          ) : (
            <PencilIcon className="size-3" />
          )}
        </Button>
      ) : null}
      {children}
    </div>
  )
}
