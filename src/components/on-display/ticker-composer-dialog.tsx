import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  useBroadcastStore,
  useSermonStore,
  useTickerComposerStore,
} from "@/stores"

export function TickerComposerDialog() {
  const isOpen = useTickerComposerStore((state) => state.isOpen)
  const sourceText = useTickerComposerStore((state) => state.text)
  const sermonSource = useTickerComposerStore((state) => state.sermonSource)

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) useTickerComposerStore.getState().close()
      }}
    >
      {isOpen ? (
        <TickerComposerContent
          initialText={sourceText}
          sermonSource={sermonSource}
        />
      ) : null}
    </Dialog>
  )
}

function TickerComposerContent({
  initialText,
  sermonSource,
}: {
  initialText: string
  sermonSource: { sessionId: string; noteIds: string[] } | null
}) {
  const [text, setText] = useState(initialText)
  const tickerConfig = useBroadcastStore.getState().overlayConfig.ticker
  const isSermonScroll = sermonSource !== null
  const [showLabel, setShowLabel] = useState(
    isSermonScroll ? true : tickerConfig.showLabel
  )
  const [labelText, setLabelText] = useState(
    isSermonScroll ? "SERMON NOTES" : tickerConfig.labelText
  )

  const save = (show: boolean) => {
    const trimmed = text.trim()
    if (!trimmed) return
    const broadcast = useBroadcastStore.getState()
    const resolvedLabel = (
      labelText.trim() || (isSermonScroll ? "Sermon Notes" : "Notice")
    ).toLocaleUpperCase()
    if (!isSermonScroll) {
      broadcast.updateTickerOverlay({
        showLabel,
        labelText: resolvedLabel,
      })
    }
    const id = broadcast.saveTickerMessage({
      text: trimmed,
      ...(isSermonScroll ? { showLabel, labelText: resolvedLabel } : {}),
      targetOutputIds: broadcast.overlayConfig.logo.logos[0]
        ?.targetOutputIds ?? ["main"],
    })
    if (sermonSource) {
      useSermonStore
        .getState()
        .setNoteTickerMessage(sermonSource.sessionId, sermonSource.noteIds, id)
    }
    if (show) broadcast.showTickerMessage(id)
    useTickerComposerStore.getState().close()
    toast.success(show ? "Scrolling text is live" : "Scrolling text saved")
  }

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>
          {isSermonScroll ? "Send sermon notes to scroll" : "Send to scroll"}
        </DialogTitle>
      </DialogHeader>
      <div className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
        <div>
          <p className="text-sm font-medium">Leading label</p>
          <p className="text-xs text-muted-foreground">
            {isSermonScroll
              ? "This label is used only for these sermon notes."
              : "Show a short label before the scrolling message."}
          </p>
        </div>
        <Switch checked={showLabel} onCheckedChange={setShowLabel} />
      </div>
      {showLabel ? (
        <label className="grid gap-1.5 text-xs font-medium">
          Label text
          <Input
            value={labelText}
            maxLength={32}
            placeholder="Notice"
            onChange={(event) => setLabelText(event.target.value)}
          />
        </label>
      ) : null}
      <label className="grid gap-1.5 text-xs font-medium">
        Scrolling message
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={4}
          className="resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          autoFocus
        />
      </label>
      <p className="text-xs text-muted-foreground">
        Review the wording before it appears over the live output.
      </p>
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => useTickerComposerStore.getState().close()}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!text.trim()}
          onClick={() => save(false)}
        >
          Save
        </Button>
        <Button
          type="button"
          disabled={!text.trim()}
          onClick={() => save(true)}
        >
          Save &amp; Show
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
