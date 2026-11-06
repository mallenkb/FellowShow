import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { deleteSermon } from "@/lib/sermon-actions"
import { useSermonDeleteDialogStore } from "@/lib/sermon-delete-dialog"
import { useSermonStore } from "@/stores/sermon-store"

export function SermonDeleteDialog() {
  const request = useSermonDeleteDialogStore((state) => state.request)
  const activeId = useSermonStore((state) => state.activeSessionId)
  const transition = useSermonStore((state) => state.transition)
  const sessionExists = useSermonStore((state) =>
    state.sessions.some((session) => session.id === request?.id)
  )
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const active = request?.id === activeId && activeId !== null

  const close = () => {
    if (deleting) return
    setError(null)
    useSermonDeleteDialogStore.getState().dismiss()
  }
  const confirm = () => {
    if (!request || deleting || transition) return
    setDeleting(true)
    setError(null)
    void deleteSermon(request.id)
      .then(() => {
        useSermonDeleteDialogStore.getState().dismiss()
        toast.success("Session deleted")
      })
      .catch((failure: unknown) => {
        setError(String(failure))
      })
      .finally(() => setDeleting(false))
  }

  return (
    <Dialog
      open={request !== null}
      onOpenChange={(open) => {
        if (!open) close()
      }}
    >
      <DialogContent showCloseButton={!deleting} className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete session?</DialogTitle>
          <DialogDescription>
            {active ? "Listening will stop first. " : ""}Delete "
            {request?.title}" and its saved transcript and notes? This cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button variant="outline" disabled={deleting} onClick={close}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={deleting || transition !== null || !sessionExists}
            onClick={confirm}
          >
            {deleting
              ? "Deleting…"
              : active
                ? "Stop & delete"
                : "Delete session"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
