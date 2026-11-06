import { useRef, useState } from "react"
import { PencilIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useSermonStore } from "@/stores"

export function ServiceTitleEditor({
  sessionId,
  title,
}: {
  sessionId: string
  title: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(title)
  const cancelled = useRef(false)

  function finishEditing() {
    const nextTitle = draft.trim()
    if (!cancelled.current && nextTitle && nextTitle !== title) {
      useSermonStore.getState().updateSessionTitle(sessionId, nextTitle)
    }
    cancelled.current = false
    setEditing(false)
  }

  if (editing) {
    return (
      <Input
        autoFocus
        aria-label="Service title"
        className="h-8 w-[min(40vw,400px)] min-w-0 shrink text-center text-sm font-medium"
        maxLength={120}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={finishEditing}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur()
          if (event.key === "Escape") {
            cancelled.current = true
            event.currentTarget.blur()
          }
        }}
      />
    )
  }

  return (
    <div className="group relative min-w-0 shrink">
      <p className="truncate text-center text-sm font-medium" title={title}>
        {title}
      </p>
      <button
        type="button"
        aria-label="Edit service title"
        title="Edit service title"
        className="absolute top-1/2 left-full ml-1 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-accent hover:text-foreground focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-ring"
        onClick={() => {
          setDraft(title)
          setEditing(true)
        }}
      >
        <PencilIcon className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  )
}
