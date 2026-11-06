import { useEffect, useState } from "react"
import { PencilIcon, PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LIVE_STATUS_BADGE_CLASS } from "@/components/ui/live-status-styles"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  resolveOverlayOutput,
  showOverlayPreviewOnLive,
} from "@/lib/overlay-live"
import {
  isFullWidthLowerThird,
  getOverlayPayloadForOutput,
} from "@/lib/overlays"
import { carriesGraphics } from "@/lib/broadcast-outputs"
import { cn } from "@/lib/utils"
import { useBroadcastStore } from "@/stores"
import {
  isOutputOn,
  useOutputRuntimeStore,
} from "@/lib/broadcast-output-runtime"
import type { ActiveOverlayState, OverlayConfiguration } from "@/types"
import { OVERLAY_KIND_STYLES, type OverlayPadKind } from "./overlay-kind-styles"
import { OverlayPadMenu } from "./overlay-pad-menu"

export type { OverlayPadKind }

const SPEED_LABELS = {
  slow: "Slow scroll",
  standard: "Normal scroll",
  fast: "Fast scroll",
} as const

const PAD_GRID_CLASS =
  "grid auto-rows-fr grid-cols-2 gap-2 @[32rem]/pads:grid-cols-3 @[42rem]/pads:grid-cols-4"

interface OverlayPad {
  key: string
  kind: OverlayPadKind
  id: string
  name: string
  kindLabel: string
  detail: string
  /** Logo images shown as small thumbnails on the pad. */
  imageUrls?: string[]
  /** Sent from Sermon, Notes or Songs. */
  sent?: boolean
}

function buildPads(config: OverlayConfiguration): OverlayPad[] {
  const pads: OverlayPad[] = []
  if (config.logo.logos.length > 0) {
    pads.push({
      key: "logo",
      kind: "logo",
      id: "logo",
      name:
        config.logo.logos.length === 1
          ? config.logo.logos[0].name
          : `${config.logo.logos.length} logos`,
      kindLabel: "Logo",
      detail: "Stays on screen",
      imageUrls: config.logo.logos.slice(0, 3).map((logo) => logo.imageUrl),
    })
  }
  for (const bar of config.bars) {
    pads.push({
      key: `bar:${bar.id}`,
      kind: "bar",
      id: bar.id,
      name: bar.name,
      kindLabel: bar.source === "text" ? "Text bar" : "Scripture bar",
      sent: bar.sent,
      detail:
        bar.source === "live-verse" ? "Follows the verse" : "Stays on screen",
    })
  }
  for (const preset of config.lowerThirdPresets) {
    pads.push({
      key: `lower:${preset.id}`,
      kind: "lowerThird",
      id: preset.id,
      name: preset.name,
      kindLabel: "Lower third",
      detail: `Hides after ${Math.round(preset.durationMs / 1000)}s`,
    })
  }
  for (const message of config.tickerMessages) {
    pads.push({
      key: `ticker:${message.id}`,
      kind: "ticker",
      id: message.id,
      name: message.text,
      kindLabel: "Scrolling text",
      sent: message.sent,
      detail: SPEED_LABELS[message.speed ?? config.ticker.speed],
    })
  }
  // Sent pads come last, so the number keys follow the order on screen.
  return [...pads.filter((pad) => !pad.sent), ...pads.filter((pad) => pad.sent)]
}

function isSelected(pad: OverlayPad, selection: ActiveOverlayState): boolean {
  switch (pad.kind) {
    case "logo":
      return selection.logoVisible
    case "bar":
      return selection.barId === pad.id
    case "lowerThird":
      return selection.lowerThird?.preset.id === pad.id
    case "ticker":
      return selection.tickerMessageId === pad.id
  }
}

/**
 * A bar fills the bottom of the screen, so it never shows with a lower third
 * or scrolling text. Returns what tapping this pad would push out of Preview.
 */
function conflictWith(
  pad: OverlayPad,
  staged: ActiveOverlayState,
  config: OverlayConfiguration
): string | null {
  const stagedBanner = isFullWidthLowerThird(staged.lowerThird?.preset)
  if (pad.kind === "bar") {
    if (staged.barId === pad.id) return null
    if (staged.tickerMessageId && staged.lowerThird) {
      return "Replaces scrolling text and lower third"
    }
    if (staged.tickerMessageId) return "Replaces scrolling text"
    if (staged.lowerThird) return "Replaces the lower third"
    return null
  }
  if (pad.kind === "ticker") {
    if (staged.barId) return "Replaces the bar"
    return stagedBanner ? "Replaces the banner" : null
  }
  if (pad.kind === "lowerThird") {
    if (staged.barId) return "Replaces the bar"
    const preset = config.lowerThirdPresets.find((item) => item.id === pad.id)
    return isFullWidthLowerThird(preset) && staged.tickerMessageId
      ? "Replaces scrolling text"
      : null
  }
  return null
}

function togglePad(pad: OverlayPad): void {
  const store = useBroadcastStore.getState()
  if (pad.kind === "logo") store.toggleStagedLogos()
  else if (pad.kind === "bar") store.toggleStagedBar(pad.id)
  else if (pad.kind === "lowerThird") store.toggleStagedLowerThird(pad.id)
  else store.toggleStagedTicker(pad.id)
}

function showPadOnLive(pad: OverlayPad): void {
  if (!isSelected(pad, useBroadcastStore.getState().stagedOverlays)) {
    togglePad(pad)
  }
  const state = useBroadcastStore.getState()
  const output = resolveOverlayOutput(
    state.outputs,
    state.selectedOverlayOutputId
  )
  if (!output) return
  void showOverlayPreviewOnLive(output.id).catch((error: unknown) => {
    console.error("[overlays] Show on Live failed", error)
  })
}

function deletePad(pad: OverlayPad): void {
  const store = useBroadcastStore.getState()
  if (pad.kind === "bar") store.deleteBarOverlay(pad.id)
  else if (pad.kind === "lowerThird") store.deleteLowerThirdPreset(pad.id)
  else if (pad.kind === "ticker") store.deleteTickerMessage(pad.id)
  else {
    for (const logo of store.overlayConfig.logo.logos) {
      store.removeLogoOverlay(logo.id)
    }
  }
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return Boolean(
    (target instanceof HTMLElement && target.isContentEditable) ||
    target.closest(
      'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="searchbox"], [role="combobox"], [role="spinbutton"], [role="listbox"], [role="menu"]'
    )
  )
}

/** Every saved graphic as a pad. Tapping one adds it to or removes it from Preview. */
export function OverlayPads({
  onAddRequest,
  onEdit,
  onPreviewRequest,
  compact = false,
}: {
  onAddRequest: () => void
  onEdit: (kind: OverlayPadKind, id: string) => void
  onPreviewRequest?: () => void
  compact?: boolean
}) {
  const config = useBroadcastStore((state) => state.overlayConfig)
  const staged = useBroadcastStore((state) => state.stagedOverlays)
  const active = useBroadcastStore((state) => state.activeOverlays)
  const liveOutputIds = useBroadcastStore((state) => state.liveOverlayOutputIds)
  const outputs = useBroadcastStore((state) => state.outputs)
  const runtime = useOutputRuntimeStore((state) => state.byId)
  const livePayloads = liveOutputIds
    .filter(
      (id) =>
        outputs.some(
          (output) => output.id === id && carriesGraphics(output, outputs)
        ) && isOutputOn(runtime[id])
    )
    .map((id) => getOverlayPayloadForOutput(config, active, id))
  const pads = buildPads(config)
  const [pendingDelete, setPendingDelete] = useState<OverlayPad | null>(null)
  const [clearSentOpen, setClearSentOpen] = useState(false)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        isTypingTarget(event.target) ||
        isTypingTarget(document.activeElement)
      )
        return
      if (
        (event.ctrlKey || event.metaKey) &&
        !event.altKey &&
        !event.shiftKey &&
        event.key === "Enter"
      ) {
        const state = useBroadcastStore.getState()
        const output = resolveOverlayOutput(
          state.outputs,
          state.selectedOverlayOutputId
        )
        if (!output) return
        event.preventDefault()
        event.stopPropagation()
        if (event.repeat) return
        onPreviewRequest?.()
        void showOverlayPreviewOnLive(output.id).catch((error: unknown) => {
          console.error("[overlays] Show on Live failed", error)
        })
        return
      }
      if (event.altKey || event.ctrlKey || event.metaKey) return
      if (!/^[1-9]$/.test(event.key)) return
      const pad = buildPads(useBroadcastStore.getState().overlayConfig)[
        Number(event.key) - 1
      ]
      if (!pad) return
      event.preventDefault()
      event.stopPropagation()
      if (event.repeat) return
      togglePad(pad)
      onPreviewRequest?.()
    }
    window.addEventListener("keydown", onKeyDown, true)
    return () => window.removeEventListener("keydown", onKeyDown, true)
  }, [onPreviewRequest])

  const sentPads = pads.filter((pad) => pad.sent)
  const renderPad = (pad: OverlayPad) => {
    const index = pads.indexOf(pad)
    const selected = isSelected(pad, staged)
    const live = livePayloads.some((payload) => {
      if (pad.kind === "logo") return payload.logos.length > 0
      if (pad.kind === "bar") return payload.bar?.id === pad.id
      if (pad.kind === "lowerThird") return payload.lowerThird?.id === pad.id
      return payload.ticker?.id === pad.id
    })
    const style = OVERLAY_KIND_STYLES[pad.kind]
    const conflict = selected ? null : conflictWith(pad, staged, config)
    return (
      <OverlayPadMenu
        key={pad.key}
        selected={selected}
        deleteLabel={pad.kind === "logo" ? "Delete logos" : "Delete"}
        onToggle={() => {
          togglePad(pad)
          onPreviewRequest?.()
        }}
        onShowLive={() => {
          showPadOnLive(pad)
          onPreviewRequest?.()
        }}
        onEdit={() => onEdit(pad.kind, pad.id)}
        onDelete={() => setPendingDelete(pad)}
      >
        <div className="relative min-w-0">
          <button
            type="button"
            aria-pressed={selected}
            aria-label={`${selected ? "Remove" : "Add"} ${pad.name} ${selected ? "from" : "to"} Preview`}
            aria-keyshortcuts={index < 9 ? String(index + 1) : undefined}
            title="Click to preview. Double-click to show on Live."
            onClick={(event) => {
              if (event.detail < 2) {
                togglePad(pad)
                onPreviewRequest?.()
              }
            }}
            onDoubleClick={() => {
              showPadOnLive(pad)
              onPreviewRequest?.()
            }}
            className={cn(
              "group flex h-full w-full flex-col justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none @[18rem]/pads:py-3",
              compact ? "min-h-24" : "min-h-36",
              selected || live
                ? style.active
                : cn(
                    "border-border/85 bg-card dark:border-border",
                    style.hover
                  ),
              (selected || live) && "ring-1",
              conflict && "opacity-60 hover:opacity-100"
            )}
          >
            <span className="flex w-full min-w-0 items-start justify-between gap-1 text-[0.6875rem]">
              <span
                className={cn(
                  "min-w-0 leading-tight font-medium break-words",
                  selected || live
                    ? style.text
                    : cn("text-muted-foreground", style.hoverText)
                )}
              >
                {pad.kindLabel}
              </span>
              {index < 9 ? (
                <kbd className="inline-flex size-6 shrink-0 items-center justify-center rounded bg-background font-mono text-[0.7rem] font-semibold text-foreground @[18rem]/pads:size-7 @[18rem]/pads:text-[0.8rem]">
                  {index + 1}
                </kbd>
              ) : null}
            </span>
            {pad.imageUrls?.length ? (
              // A logo pad shows the logo itself; its name stays in the
              // button's label for screen readers.
              <span className="flex min-w-0 flex-wrap items-center gap-1">
                {pad.imageUrls.map((url) => (
                  <img
                    key={url}
                    src={url}
                    alt=""
                    className="h-12 max-w-full rounded-md bg-black/40 object-contain p-1.5 @[18rem]/pads:h-14 @[18rem]/pads:max-w-24"
                  />
                ))}
              </span>
            ) : (
              <span className="line-clamp-3 min-w-0 text-xs font-medium break-words @[18rem]/pads:text-sm">
                {pad.name}
              </span>
            )}
            {live ? (
              <span
                className={cn(
                  "mr-8 inline-flex w-fit items-center gap-1 rounded px-1.5 py-0.5 text-[0.625rem] font-semibold tracking-wide uppercase",
                  LIVE_STATUS_BADGE_CLASS
                )}
              >
                <span className="size-1.5 rounded-full bg-current" />
                Live
              </span>
            ) : (
              <span className="min-w-0 pr-8 text-[0.6875rem] leading-tight text-muted-foreground">
                {pad.detail}
              </span>
            )}
          </button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            // The icon lines up with the number badge's 12px inset.
            className="absolute right-1.5 bottom-1.5 text-muted-foreground"
            aria-label={`Edit ${pad.name}`}
            title="Edit"
            onClick={() => onEdit(pad.kind, pad.id)}
          >
            <PencilIcon />
          </Button>
        </div>
      </OverlayPadMenu>
    )
  }

  return (
    <div className="@container/pads grid gap-3">
      <div className={PAD_GRID_CLASS}>
        {pads.filter((pad) => !pad.sent).map(renderPad)}
        <button
          type="button"
          onClick={onAddRequest}
          className={cn(
            "flex min-w-0 flex-wrap items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-3 text-center text-xs text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none @[18rem]/pads:text-sm",
            compact ? "min-h-24" : "min-h-36"
          )}
        >
          <PlusIcon className="size-4" /> Add graphic
        </button>
      </div>
      {sentPads.length > 0 ? (
        <section
          aria-labelledby="sent-pads-heading"
          className="grid gap-2 pt-1"
        >
          <div className="flex min-w-0 items-center gap-2">
            <h3
              id="sent-pads-heading"
              className="min-w-0 text-[0.6875rem] font-medium tracking-wider text-muted-foreground uppercase"
            >
              Sent from Bible, Notes and Songs
            </h3>
            {/* The divider runs through the heading row. */}
            <span
              aria-hidden="true"
              className="hidden h-px flex-1 bg-border @[24rem]/pads:block"
            />
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="text-muted-foreground"
              onClick={() => setClearSentOpen(true)}
            >
              Clear
            </Button>
          </div>
          <div className={PAD_GRID_CLASS}>{sentPads.map(renderPad)}</div>
        </section>
      ) : null}
      <ConfirmDialog
        open={clearSentOpen}
        onOpenChange={setClearSentOpen}
        title="Clear sent graphics?"
        description="Everything sent from Bible, Notes and Songs is removed from its pad, Preview and Live."
        confirmLabel="Clear"
        destructive
        onConfirm={() => {
          for (const pad of sentPads) deletePad(pad)
        }}
      />
      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
        title={
          pendingDelete?.kind === "logo"
            ? "Delete all logos?"
            : `Delete ${pendingDelete?.name ?? "this graphic"}?`
        }
        description="It is removed from its pad, Preview, Live and any Looks."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (pendingDelete) deletePad(pendingDelete)
        }}
      />
    </div>
  )
}
