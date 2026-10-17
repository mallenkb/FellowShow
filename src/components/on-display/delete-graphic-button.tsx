import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

/** The Delete button every graphic editor shares, with the same confirm as the pads. */
export function DeleteGraphicButton({
  name,
  label = "Delete",
  onDelete,
}: {
  name: string
  label?: string
  onDelete: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className="text-destructive hover:text-destructive"
        onClick={() => setConfirming(true)}
      >
        {label}
      </Button>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Delete ${name}?`}
        description="It is removed from its pad, Preview, Live and any Looks."
        confirmLabel="Delete"
        destructive
        onConfirm={onDelete}
      />
    </>
  )
}
