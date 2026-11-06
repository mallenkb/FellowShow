import { useEffect, useRef, useState } from "react"
import {
  FileTextIcon,
  LoaderCircleIcon,
  MoreHorizontalIcon,
  PlayIcon,
  Trash2Icon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatSermonDuration } from "@/lib/sermon-session"
import { cn } from "@/lib/utils"
import type { SermonSession } from "@/types"
import { SESSION_CARD_CLASS, SessionDateBadge } from "./session-card"

export function SessionReturnCard({
  session,
  active,
  busy,
  connected,
  transcribing,
  connectionError,
  saveError,
  onContinue,
  onFinish,
  onReview,
  onDelete,
}: {
  session: SermonSession
  active: boolean
  busy: boolean
  connected: boolean
  transcribing: boolean
  connectionError: boolean
  saveError: boolean
  onContinue: () => void
  onFinish: () => void
  onReview: () => void
  onDelete: () => void
}) {
  const [now, setNow] = useState(() => Date.now())
  const openingDialog = useRef(false)
  const pausedAt = session.pausedAt ?? session.recordingSpans?.at(-1)?.endedAt

  useEffect(() => {
    if (active || session.prepared || pausedAt == null) return
    const timer = window.setInterval(() => setNow(Date.now()), 1_000)
    return () => window.clearInterval(timer)
  }, [active, pausedAt, session.prepared])

  const continueLabel = busy
    ? "Please wait"
    : active
      ? "Return to sermon"
      : session.prepared
        ? "Start listening"
        : "Resume"
  const date = new Date(session.startedAt)
  const fullDate = date.toLocaleDateString([], { dateStyle: "long" })
  const showDate = !session.title
    .toLocaleLowerCase()
    .includes(fullDate.toLocaleLowerCase())
  const away =
    !active && !session.prepared
      ? pausedAt == null
        ? "Time away unavailable"
        : `${formatSermonDuration(Math.max(0, now - pausedAt))} away`
      : null
  const connectionStatus =
    active && !connected
      ? connectionError
        ? "Connection error"
        : transcribing
          ? "Connecting"
          : "Listening stopped"
      : null
  const metadata = [
    showDate
      ? date.toLocaleDateString([], {
          weekday: "long",
          month: "short",
          day: "numeric",
        })
      : null,
    away,
    session.interrupted && !active ? "Stopped unexpectedly" : null,
    connectionStatus,
    session.speaker,
    session.series,
  ]
    .filter(Boolean)
    .join(" · ")
  const notice = saveError
    ? "Retry saving this session before closing the app."
    : session.interrupted && !active
      ? "The last checkpoint may not include the end of the sermon."
      : active && !connected
        ? "Check the connection in the workspace."
        : null
  const accessibleLabel = [continueLabel, session.title, metadata, notice]
    .filter(Boolean)
    .join(". ")

  const openFromMenu = (action: () => void) => {
    openingDialog.current = true
    action()
  }

  return (
    <section
      aria-label="Current sermon"
      className={cn(
        SESSION_CARD_CLASS,
        "flex flex-wrap items-center gap-3 sm:flex-nowrap"
      )}
    >
      <button
        type="button"
        className="flex min-w-0 flex-1 basis-full items-center gap-3 rounded-[10px] text-left transition-colors hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50 sm:basis-auto"
        disabled={busy}
        onClick={onContinue}
        aria-label={accessibleLabel}
        title={notice ?? continueLabel}
      >
        <SessionDateBadge timestamp={session.startedAt} current />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-medium sm:text-lg">
            {session.title}
          </span>
          {metadata ? (
            <span className="block truncate text-sm text-muted-foreground">
              {metadata}
            </span>
          ) : null}
        </span>
      </button>
      <div
        className="ml-auto flex max-w-full shrink-0 flex-wrap items-center justify-end gap-2"
        role="group"
        aria-label="Session actions"
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="rounded-[10px]"
              disabled={busy}
              aria-label="More session actions"
              title="More actions"
            >
              <MoreHorizontalIcon aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-44"
            onCloseAutoFocus={(event) => {
              if (openingDialog.current) {
                event.preventDefault()
                openingDialog.current = false
              }
            }}
          >
            <DropdownMenuItem onSelect={() => openFromMenu(onReview)}>
              <FileTextIcon aria-hidden="true" />
              Review session
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => openFromMenu(onDelete)}
            >
              <Trash2Icon aria-hidden="true" />
              Delete session
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          type="button"
          variant="secondary"
          className="rounded-[10px]"
          disabled={busy || Boolean(session.prepared)}
          onClick={onFinish}
        >
          Finish Sermon
        </Button>
        <Button
          type="button"
          className="rounded-[10px]"
          disabled={busy}
          onClick={onContinue}
          aria-busy={busy}
        >
          {busy ? (
            <LoaderCircleIcon className="animate-spin" aria-hidden="true" />
          ) : (
            <PlayIcon aria-hidden="true" />
          )}
          {continueLabel}
        </Button>
      </div>
    </section>
  )
}
