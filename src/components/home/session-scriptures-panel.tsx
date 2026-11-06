import { BookOpenIcon } from "lucide-react"
import type { SermonSession } from "@/types"

export function SessionScripturesPanel({
  session,
}: {
  session: SermonSession
}) {
  const references = session.directScriptures ?? []
  const isIncomplete =
    session.directScriptures === undefined || session.directScripturesIncomplete

  return (
    <section aria-label="Directly detected scriptures" className="space-y-4">
      <div>
        <h2 className="text-base font-medium">Scriptures</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Directly detected references from this sermon.
        </p>
      </div>
      {isIncomplete ? (
        <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
          Direct detections were not saved separately for the earlier part of
          this sermon. Only references recorded separately are shown.
        </p>
      ) : null}
      {references.length ? (
        <ul className="space-y-2">
          {references.map((reference) => (
            <li
              key={reference}
              className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
            >
              <BookOpenIcon
                aria-hidden="true"
                className="size-4 shrink-0 text-primary-emphasis"
              />
              <span className="text-sm font-medium break-words">
                {reference}
              </span>
            </li>
          ))}
        </ul>
      ) : !isIncomplete ? (
        <p className="py-4 text-sm text-muted-foreground">
          No scriptures were directly detected in this sermon.
        </p>
      ) : null}
    </section>
  )
}
