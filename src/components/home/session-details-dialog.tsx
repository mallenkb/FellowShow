import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { SermonSession } from "@/types"

export interface SessionDetails {
  title: string
  speaker: string
  series: string
}

export function SessionDetailsDialog({
  session,
  busy,
  onClose,
  onSave,
}: {
  session?: SermonSession
  busy: boolean
  onClose: () => void
  onSave: (details: SessionDetails) => void
}) {
  const [details, setDetails] = useState<SessionDetails>(() => ({
    title:
      session?.title ??
      new Date().toLocaleString([], { dateStyle: "full", timeStyle: "short" }),
    speaker: session?.speaker ?? "",
    series: session?.series ?? "",
  }))
  const edit = session !== undefined

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose()
      }}
    >
      <DialogContent showCloseButton={!busy}>
        <DialogHeader>
          <DialogTitle>
            {edit ? "Edit session details" : "Prepare a new session"}
          </DialogTitle>
          <DialogDescription>
            {edit
              ? "These details help you find this session later."
              : "Set up the session now. The microphone stays off until you start listening."}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault()
            onSave(details)
          }}
        >
          <label className="grid gap-2 text-sm">
            Session title
            <Input
              autoFocus
              required
              maxLength={120}
              value={details.title}
              disabled={busy}
              onChange={(event) =>
                setDetails({ ...details, title: event.target.value })
              }
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm">
              Speaker <span className="sr-only">optional</span>
              <Input
                maxLength={120}
                value={details.speaker}
                disabled={busy}
                placeholder="Optional"
                onChange={(event) =>
                  setDetails({ ...details, speaker: event.target.value })
                }
              />
            </label>
            <label className="grid gap-2 text-sm">
              Series <span className="sr-only">optional</span>
              <Input
                maxLength={120}
                value={details.series}
                disabled={busy}
                placeholder="Optional"
                onChange={(event) =>
                  setDetails({ ...details, series: event.target.value })
                }
              />
            </label>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !details.title.trim()}>
              {busy ? "Saving…" : edit ? "Save changes" : "Prepare session"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
