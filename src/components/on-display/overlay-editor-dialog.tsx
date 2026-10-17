import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useBroadcastStore } from "@/stores"
import { BarOverlayDialog } from "./bar-overlay-dialog"
import { DeleteGraphicButton } from "./delete-graphic-button"
import { LogoOverlaySection } from "./logo-overlay-section"
import { LowerThirdOverlaySection } from "./lower-third-overlay-section"
import type { OverlayPadKind } from "./overlay-kind-styles"
import { TickerMessageDialog } from "./ticker-message-dialog"

/** Logos share one pad, so their editor manages the whole set and saves as you go. */
function LogoDialog({ onClose }: { onClose: () => void }) {
  const logos = useBroadcastStore((state) => state.overlayConfig.logo.logos)
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>
            {logos.length > 0 ? "Edit logos" : "Add logo"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Add logos and set where each one sits on screen.
          </DialogDescription>
        </DialogHeader>
        <LogoOverlaySection />
        <DialogFooter className="items-center sm:justify-between">
          {logos.length > 0 ? (
            <DeleteGraphicButton
              name="all logos"
              label="Delete logos"
              onDelete={() => {
                const store = useBroadcastStore.getState()
                for (const logo of logos) store.removeLogoOverlay(logo.id)
                onClose()
              }}
            />
          ) : (
            <span />
          )}
          <Button type="button" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function LowerThirdDialog({
  id,
  onClose,
}: {
  id: string | null
  onClose: () => void
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {id ? "Edit lower third" : "Add lower third"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Choose a style and edit the text, then save it to Preview.
          </DialogDescription>
        </DialogHeader>
        <LowerThirdOverlaySection
          initialEditId={id ?? undefined}
          onDone={onClose}
        />
      </DialogContent>
    </Dialog>
  )
}

/**
 * The one editor for every graphic. Adding passes a null id. Mount it with a
 * key per opening so each one starts from saved values.
 */
export function OverlayEditorDialog({
  kind,
  id,
  onClose,
}: {
  kind: OverlayPadKind
  id: string | null
  onClose: () => void
}) {
  const onOpenChange = (open: boolean) => {
    if (!open) onClose()
  }
  if (kind === "bar") {
    return <BarOverlayDialog barId={id} open onOpenChange={onOpenChange} />
  }
  if (kind === "ticker") {
    return (
      <TickerMessageDialog messageId={id} open onOpenChange={onOpenChange} />
    )
  }
  if (kind === "lowerThird")
    return <LowerThirdDialog id={id} onClose={onClose} />
  return <LogoDialog onClose={onClose} />
}
