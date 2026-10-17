import { useEffect, useState } from "react"
import { PencilIcon, PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  resolveOverlayOutput,
  showOverlayPreviewOnLive,
} from "@/lib/overlay-live"
import {
  isFullWidthLowerThird,
  getOverlayPayloadForOutput,
  overlaySelectionsMatch,
  resolveOverlaySelection,
} from "@/lib/overlays"
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
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName))
  )
}

/** What Show on Live will change, one colored chip per graphic. */
function changeSummary(
  config: OverlayConfiguration,
  staged: ActiveOverlayState,
  active: ActiveOverlayState,
  onAir: boolean
): { kind: OverlayPadKind; text: string; removed: boolean }[] {
  const pads = buildPads(config)
  const before = onAir ? active : null
  const changes: { kind: OverlayPadKind; text: string; removed: boolean }[] = []
  for (const pad of pads) {
    const next = isSelected(pad, staged)
    const now = before ? isSelected(pad, before) : false
    if (next !== now) {
      changes.push({ kind: pad.kind, text: pad.name, removed: !next })
    }
  }
  return changes
}

/** Every saved graphic as a pad. Tapping one adds it to or removes it from Preview. */
export function OverlayPads({
  onAddRequest,
  onEdit,
}: {
  onAddRequest: () => void
  onEdit: (kind: OverlayPadKind, id: string) => void
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
          (output) => output.id === id && output.content === "overlays"
        ) && isOutputOn(runtime[id])
    )
    .map((id) => getOverlayPayloadForOutput(config, active, id))
  const graphicsOnAir = livePayloads.length > 0
  const pads = buildPads(config)
  const resolvedStaged = resolveOverlaySelection(config, staged)
  const resolvedActive = resolveOverlaySelection(config, active)
  const changes = changeSummary(
    config,
    resolvedStaged,
    resolvedActive,
    graphicsOnAir
  )
  const [pendingDelete, setPendingDelete] = useState<OverlayPad | null>(null)
  const [clearSentOpen, setClearSentOpen] = useState(false)
  const matchesLive =
    graphicsOnAir && overlaySelectionsMatch(resolvedStaged, resolvedActive)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return
      if (document.querySelector('[role="dialog"]')) return
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        const state = useBroadcastStore.getState()
        const output = resolveOverlayOutput(
          state.outputs,
          state.selectedOverlayOutputId
        )
        if (!output) return
        event.preventDefault()
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
      togglePad(pad)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

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
        onToggle={() => togglePad(pad)}
        onShowLive={() => showPadOnLive(pad)}
        onEdit={() => onEdit(pad.kind, pad.id)}
        onDelete={() => setPendingDelete(pad)}
      >
        <div className="relative min-w-0">
          <button
            type="button"
            aria-pressed={selected}
            aria-label={`${selected ? "Remove" : "Add"} ${pad.name} ${selected ? "from" : "to"} Preview`}
            title="Click to preview. Double-click to show on Live."
            onClick={(event) => {
              if (event.detail < 2) togglePad(pad)
            }}
            onDoubleClick={() => showPadOnLive(pad)}
            className={cn(
              "group flex h-full min-h-36 w-full flex-col justify-between gap-2 rounded-lg border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
              selected || live
                ? style.active
                : cn("border-border bg-card", style.hover),
              (selected || live) && "ring-1",
              conflict && "opacity-60 hover:opacity-100"
            )}
          >
            <span className="flex w-full items-center justify-between gap-2 text-[0.6875rem]">
              <span
                className={cn(
                  "truncate font-medium",
                  selected || live
                    ? style.text
                    : cn("text-muted-foreground", style.hoverText)
                )}
              >
                {pad.kindLabel}
              </span>
              {index < 9 ? (
                <kbd className="rounded border border-border bg-background/40 px-1.5 font-mono text-[0.625rem] text-muted-foreground">
                  {index + 1}
                </kbd>
              ) : null}
            </span>
            {pad.imageUrls?.length ? (
              // A logo pad shows the logo itself; its name stays in the
              // button's label for screen readers.
              <span className="flex min-w-0 items-center gap-2">
                {pad.imageUrls.map((url) => (
                  <img
                    key={url}
                    src={url}
                    alt=""
                    className="h-14 max-w-24 rounded-md bg-black/40 object-contain p-1.5"
                  />
                ))}
              </span>
            ) : (
              <span className="line-clamp-3 min-w-0 text-sm font-medium break-words">
                {pad.name}
              </span>
            )}
            {live ? (
              <span className="mr-8 inline-flex w-fit items-center gap-1 rounded bg-red-500/15 px-1.5 py-0.5 text-[0.625rem] font-semibold tracking-wide text-red-500 uppercase">
                <span className="size-1.5 rounded-full bg-current" />
                Live
              </span>
            ) : (
              <span className="truncate pr-8 text-[0.6875rem] text-muted-foreground">
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
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-2 xl:grid-cols-3">
        {pads.filter((pad) => !pad.sent).map(renderPad)}
        <button
          type="button"
          onClick={onAddRequest}
          className="flex min-h-36 items-center justify-center gap-2 rounded-lg border border-dashed border-border text-sm text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <PlusIcon className="size-4" /> Add graphic
        </button>
      </div>
      {sentPads.length > 0 ? (
        <section
          aria-labelledby="sent-pads-heading"
          className="grid gap-2 pt-1"
        >
          <div className="flex items-center gap-3">
            <h3
              id="sent-pads-heading"
              className="shrink-0 text-[0.6875rem] font-medium tracking-wider text-muted-foreground uppercase"
            >
              Sent from Sermon, Notes and Songs
            </h3>
            {/* The divider runs through the heading row. */}
            <span aria-hidden="true" className="h-px flex-1 bg-border" />
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
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-3">
            {sentPads.map(renderPad)}
          </div>
        </section>
      ) : null}
      <div
        aria-live="polite"
        className="flex min-h-6 flex-wrap items-center gap-1.5 text-[0.6875rem] text-muted-foreground"
      >
        {matchesLive ? (
          "Live matches Preview."
        ) : changes.length === 0 ? (
          "Nothing in Preview yet. Tap a pad or a Look."
        ) : (
          <>
            <span>Show on Live will</span>
            {changes.map((change) => (
              <span
                key={`${change.kind}:${change.text}`}
                className={cn(
                  "inline-flex max-w-56 items-center gap-1 rounded border px-1.5 py-0.5",
                  OVERLAY_KIND_STYLES[change.kind].tile,
                  change.removed && "line-through opacity-70"
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    OVERLAY_KIND_STYLES[change.kind].dot
                  )}
                />
                <span className="truncate text-foreground">
                  {change.removed ? "remove " : "show "}
                  {change.text}
                </span>
              </span>
            ))}
          </>
        )}
      </div>
      <ConfirmDialog
        open={clearSentOpen}
        onOpenChange={setClearSentOpen}
        title="Clear sent graphics?"
        description="Everything sent from Sermon, Notes and Songs is removed from its pad, Preview and Live."
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
