import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { LogoOverlaySection } from "./logo-overlay-section"
import { LowerThirdOverlaySection } from "./lower-third-overlay-section"
import { TickerOverlaySection } from "./ticker-overlay-section"
import type { OverlayPadKind } from "./overlay-kind-styles"
import { cn } from "@/lib/utils"

export type OverlayEditorKind = Exclude<OverlayPadKind, "bar">

const TITLES: Record<
  OverlayEditorKind,
  { title: string; description: string }
> = {
  logo: {
    title: "Logos",
    description: "Add logos and set where each one sits on screen.",
  },
  ticker: {
    title: "Scrolling text",
    description: "Write and save messages. Saved messages appear as pads.",
  },
  lowerThird: {
    title: "Lower thirds",
    description: "Create and edit names and titles. Each one appears as a pad.",
  },
}

/** Opens the full editor for one graphic type only when the operator asks. */
export function OverlayEditorDialog({
  kind,
  editId,
  onOpenChange,
}: {
  kind: OverlayEditorKind | null
  /** The graphic to open for editing; null adds a new one. */
  editId: string | null
  onOpenChange: (open: boolean) => void
}) {
  const copy = kind ? TITLES[kind] : null
  return (
    <Dialog open={kind !== null} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[calc(100dvh-2rem)] overflow-y-auto",
          kind === "lowerThird"
            ? "sm:max-w-6xl"
            : kind === "logo"
              ? "sm:max-w-5xl"
              : "sm:max-w-3xl"
        )}
      >
        <DialogHeader>
          <DialogTitle>
            {kind === "lowerThird"
              ? editId
                ? "Edit lower third"
                : "Add lower third"
              : copy?.title}
          </DialogTitle>
          <DialogDescription>
            {kind === "lowerThird"
              ? "Choose a style and edit the text. Saving puts this graphic in Preview."
              : copy?.description}
          </DialogDescription>
        </DialogHeader>
        {kind === "logo" ? (
          <LogoOverlaySection initialEditId={editId ?? undefined} />
        ) : null}
        {kind === "ticker" ? (
          <TickerOverlaySection initialEditId={editId ?? undefined} />
        ) : null}
        {kind === "lowerThird" ? (
          <LowerThirdOverlaySection
            key={editId ?? "new"}
            initialEditId={editId ?? undefined}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
