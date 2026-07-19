import { useState } from "react"
import {
  MoreHorizontalIcon,
  PencilIcon,
  PlayIcon,
  Settings2Icon,
  SquareIcon,
  Trash2Icon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { useBroadcastStore } from "@/stores"
import type { TickerMessage, TickerOverlayConfig } from "@/types"
import { OutputTargetSelector } from "./output-target-selector"
import { OverlaySection } from "./overlay-section"

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="grid gap-1 text-xs font-medium">
      {label}
      <div className="flex h-9 items-center gap-2 rounded-md border border-input bg-background px-2">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="size-6 cursor-pointer rounded border-0 bg-transparent p-0"
        />
        <span className="text-xs text-muted-foreground uppercase">{value}</span>
      </div>
    </label>
  )
}

function TickerPreview({
  message,
  config,
}: {
  message: string
  config: TickerOverlayConfig
}) {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-black p-3">
      <p className="mb-2 text-[0.625rem] font-medium tracking-wider text-white/60 uppercase">
        Preview
      </p>
      <div className="flex h-14 overflow-hidden rounded-sm">
        {config.showLabel ? (
          <div
            className="flex w-28 shrink-0 items-center justify-center px-2 text-center text-sm font-bold"
            style={{
              backgroundColor: config.labelBackgroundColor,
              color: config.labelTextColor,
            }}
          >
            <span className="truncate">
              {config.labelText.toLocaleUpperCase()}
            </span>
          </div>
        ) : null}
        <div
          className="flex min-w-0 flex-1 items-center px-4 text-sm font-semibold"
          style={{
            backgroundColor: config.backgroundColor,
            color: config.textColor,
          }}
        >
          <span className="truncate">
            {message.trim() || "Your scrolling message"}
          </span>
        </div>
      </div>
    </div>
  )
}

export function TickerOverlaySection() {
  const tickerConfig = useBroadcastStore((state) => state.overlayConfig.ticker)
  const messages = useBroadcastStore(
    (state) => state.overlayConfig.tickerMessages
  )
  const activeMessageId = useBroadcastStore(
    (state) => state.activeOverlays.tickerMessageId
  )
  const updateTicker = useBroadcastStore((state) => state.updateTickerOverlay)
  const saveMessage = useBroadcastStore((state) => state.saveTickerMessage)
  const deleteMessage = useBroadcastStore((state) => state.deleteTickerMessage)
  const showMessage = useBroadcastStore((state) => state.showTickerMessage)
  const stopMessage = useBroadcastStore((state) => state.stopTickerMessage)
  const defaultTargets = useBroadcastStore(
    (state) => state.overlayConfig.logo.targetOutputIds
  )
  const [text, setText] = useState("")
  const [targetOutputIds, setTargetOutputIds] = useState(defaultTargets)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState("")
  const [editTargetOutputIds, setEditTargetOutputIds] = useState(defaultTargets)
  const [appearanceOpen, setAppearanceOpen] = useState(false)
  const [appearance, setAppearance] =
    useState<TickerOverlayConfig>(tickerConfig)

  const saveNewMessage = () => {
    const trimmedText = text.trim()
    if (!trimmedText) return
    saveMessage({ text: trimmedText, targetOutputIds })
    setText("")
  }

  const openEditor = (message: TickerMessage) => {
    setEditingId(message.id)
    setEditText(message.text)
    setEditTargetOutputIds(message.targetOutputIds)
  }

  const closeEditor = () => setEditingId(null)

  const saveEdits = () => {
    const trimmedText = editText.trim()
    if (!editingId || !trimmedText) return
    const wasActive = editingId === activeMessageId
    const existing = messages.find((message) => message.id === editingId)
    saveMessage({
      id: editingId,
      text: trimmedText,
      labelText: existing?.labelText,
      showLabel: existing?.showLabel,
      targetOutputIds: editTargetOutputIds,
    })
    if (wasActive) showMessage(editingId)
    closeEditor()
  }

  const openAppearance = () => {
    setAppearance(tickerConfig)
    setAppearanceOpen(true)
  }

  const saveAppearance = () => {
    updateTicker(appearance)
    setAppearanceOpen(false)
  }

  return (
    <OverlaySection
      title="Scrolling text"
      description="Loops until you stop it. Double-click a saved message to show it."
      action={
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={openAppearance}
            aria-label="Scrolling text appearance"
            title="Appearance"
          >
            <Settings2Icon />
          </Button>
          {activeMessageId ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={stopMessage}
            >
              <SquareIcon /> Stop
            </Button>
          ) : null}
        </div>
      }
    >
      <div className="flex items-end gap-2">
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Type a scrolling message"
          rows={3}
          className="min-h-20 min-w-0 flex-1 resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
        />
        <OutputTargetSelector
          value={targetOutputIds}
          onChange={setTargetOutputIds}
        />
        <Button
          type="button"
          size="sm"
          disabled={!text.trim()}
          onClick={saveNewMessage}
        >
          Save
        </Button>
      </div>

      <div className="mt-3 grid gap-1.5">
        {messages.length === 0 ? (
          <p className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
            Saved messages appear here.
          </p>
        ) : (
          messages.map((message) => {
            const isActive = message.id === activeMessageId
            return (
              <div
                key={message.id}
                onDoubleClick={() => showMessage(message.id)}
                className={cn(
                  "flex items-center gap-2 rounded-md border px-3 py-2 transition-colors",
                  isActive
                    ? "border-red-500/50 bg-red-500/10"
                    : "border-border hover:bg-muted/50"
                )}
              >
                <span className="min-w-0 flex-1 text-sm leading-relaxed break-words whitespace-normal">
                  {message.text}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={isActive ? "Stop message" : "Show message"}
                  onClick={() => {
                    if (isActive) stopMessage()
                    else showMessage(message.id)
                  }}
                >
                  {isActive ? <SquareIcon /> : <PlayIcon />}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="More message actions"
                      onDoubleClick={(event) => event.stopPropagation()}
                    >
                      <MoreHorizontalIcon />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => openEditor(message)}>
                      <PencilIcon /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => {
                        deleteMessage(message.id)
                        if (editingId === message.id) closeEditor()
                      }}
                    >
                      <Trash2Icon /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )
          })
        )}
      </div>

      <Dialog
        open={editingId !== null}
        onOpenChange={(open) => {
          if (!open) closeEditor()
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit scrolling message</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <label className="grid gap-1 text-xs font-medium">
              Message
              <textarea
                value={editText}
                onChange={(event) => setEditText(event.target.value)}
                rows={3}
                className="min-h-20 resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
              />
            </label>
            <TickerPreview message={editText} config={tickerConfig} />
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium">Display</span>
              <OutputTargetSelector
                value={editTargetOutputIds}
                onChange={setEditTargetOutputIds}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeEditor}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!editText.trim()}
              onClick={saveEdits}
            >
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={appearanceOpen} onOpenChange={setAppearanceOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Scrolling text appearance</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <TickerPreview
              message="Your scrolling message"
              config={appearance}
            />
            <div className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
              <div>
                <p className="text-sm font-medium">Show label</p>
                <p className="text-xs text-muted-foreground">
                  Display the leading label before the message.
                </p>
              </div>
              <Switch
                checked={appearance.showLabel}
                onCheckedChange={(showLabel) =>
                  setAppearance((current) => ({ ...current, showLabel }))
                }
              />
            </div>
            {appearance.showLabel ? (
              <label className="grid gap-1 text-xs font-medium">
                Label text
                <Input
                  value={appearance.labelText}
                  maxLength={32}
                  onChange={(event) =>
                    setAppearance((current) => ({
                      ...current,
                      labelText: event.target.value,
                    }))
                  }
                />
              </label>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              {appearance.showLabel ? (
                <>
                  <ColorField
                    label="Label background"
                    value={appearance.labelBackgroundColor}
                    onChange={(labelBackgroundColor) =>
                      setAppearance((current) => ({
                        ...current,
                        labelBackgroundColor,
                      }))
                    }
                  />
                  <ColorField
                    label="Label text"
                    value={appearance.labelTextColor}
                    onChange={(labelTextColor) =>
                      setAppearance((current) => ({
                        ...current,
                        labelTextColor,
                      }))
                    }
                  />
                </>
              ) : null}
              <ColorField
                label="Message background"
                value={appearance.backgroundColor}
                onChange={(backgroundColor) =>
                  setAppearance((current) => ({
                    ...current,
                    backgroundColor,
                  }))
                }
              />
              <ColorField
                label="Message text"
                value={appearance.textColor}
                onChange={(textColor) =>
                  setAppearance((current) => ({ ...current, textColor }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAppearanceOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={saveAppearance}>
              Save appearance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OverlaySection>
  )
}
