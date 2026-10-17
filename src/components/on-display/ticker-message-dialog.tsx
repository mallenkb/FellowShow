import { useState } from "react"
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
import type { TickerMessage, TickerOverlayConfig } from "@/types"
import { DeleteGraphicButton } from "./delete-graphic-button"
import { OutputTargetSelector } from "./output-target-selector"
import { OverlayDesignPreview } from "./overlay-design-preview"
import { TickerDesignFields } from "./ticker-design-fields"

const TEXTAREA_CLASS =
  "min-h-28 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"

/** A message's look: its own values where set, else the shared look. */
function lookFor(
  message: TickerMessage | undefined,
  shared: TickerOverlayConfig
): TickerOverlayConfig {
  return {
    ...shared,
    style: message?.style ?? shared.style,
    backgroundColor: message?.backgroundColor ?? shared.backgroundColor,
    textColor: message?.textColor ?? shared.textColor,
    labelBackgroundColor:
      message?.labelBackgroundColor ?? shared.labelBackgroundColor,
    labelTextColor: message?.labelTextColor ?? shared.labelTextColor,
    labelText: message?.labelText ?? shared.labelText,
    showLabel: message?.showLabel ?? shared.showLabel,
    speed: message?.speed ?? shared.speed,
  }
}

/**
 * Edits one scrolling message: its words, design, colors, label and speed.
 * Mount it with a key per message so each opening starts from saved values.
 */
export function TickerMessageDialog({
  messageId,
  open,
  onOpenChange,
}: {
  messageId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const message = useBroadcastStore((state) =>
    state.overlayConfig.tickerMessages.find((item) => item.id === messageId)
  )
  const shared = useBroadcastStore((state) => state.overlayConfig.ticker)
  const outputs = useBroadcastStore((state) => state.outputs)
  const [text, setText] = useState(message?.text ?? "")
  const [look, setLook] = useState(() => lookFor(message, shared))
  const [targets, setTargets] = useState(
    () => message?.targetOutputIds ?? outputs.map((output) => output.id)
  )

  const save = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    const store = useBroadcastStore.getState()
    const id = store.saveTickerMessage({
      id: messageId ?? undefined,
      text: trimmed,
      labelText: look.labelText.trim() || undefined,
      showLabel: look.showLabel,
      speed: look.speed,
      style: look.style,
      backgroundColor: look.backgroundColor,
      textColor: look.textColor,
      labelBackgroundColor: look.labelBackgroundColor,
      labelTextColor: look.labelTextColor,
      targetOutputIds: targets,
    })
    // Saving puts the message in Preview, like every other graphic.
    if (store.stagedOverlays.tickerMessageId !== id)
      store.toggleStagedTicker(id)
    onOpenChange(false)
  }

  const remove = () => {
    if (!messageId) return
    useBroadcastStore.getState().deleteTickerMessage(messageId)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {messageId ? "Edit scrolling text" : "Add scrolling text"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Write the message, pick a design, then save.
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-hidden rounded-lg border border-border">
          <OverlayDesignPreview
            overlays={{
              logos: [],
              lowerThird: null,
              bar: null,
              ticker: {
                ...look,
                id: "draft",
                text: text || "Type your message",
                startedAt: 0,
              },
            }}
          />
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="grid content-start gap-3">
            <label className="grid gap-1 text-xs font-medium">
              Message
              <textarea
                value={text}
                rows={5}
                autoFocus
                placeholder="Type what should scroll"
                className={TEXTAREA_CLASS}
                onChange={(event) => setText(event.target.value)}
              />
            </label>
            <div className="flex items-center justify-between gap-3 text-xs font-medium">
              Show on
              <OutputTargetSelector value={targets} onChange={setTargets} />
            </div>
          </div>
          <TickerDesignFields
            value={look}
            sampleText={text}
            onChange={setLook}
          />
        </div>
        <DialogFooter className="items-center sm:justify-between">
          {messageId ? (
            <DeleteGraphicButton name="this scrolling text" onDelete={remove} />
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="button" disabled={!text.trim()} onClick={save}>
              Save to Preview
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
