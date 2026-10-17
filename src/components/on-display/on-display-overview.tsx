import { useState } from "react"
import { OverlayLiveNow } from "./overlay-live-now"
import { OverlayLookDialog } from "./overlay-look-dialog"
import { OverlayLooks } from "./overlay-looks"

/** Left panel of the Video Overlays tab: what is live, and saved Looks. */
export function OnDisplayOverview() {
  const [lookEditor, setLookEditor] = useState({
    open: false,
    id: null as string | null,
    key: 0,
  })
  const openLook = (id: string | null) =>
    setLookEditor((state) => ({ open: true, id, key: state.key + 1 }))

  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
      <OverlayLiveNow />
      <OverlayLooks onSave={() => openLook(null)} onEdit={openLook} />
      <OverlayLookDialog
        key={lookEditor.key}
        lookId={lookEditor.id}
        open={lookEditor.open}
        onOpenChange={(open) => setLookEditor((state) => ({ ...state, open }))}
      />
    </div>
  )
}
