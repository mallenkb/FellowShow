import { useCallback, useEffect, useRef, useState } from "react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { toast } from "sonner"
import { useBroadcastStore } from "@/stores"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { RotateCcwIcon, SaveIcon, Undo2Icon, Redo2Icon, XIcon } from "lucide-react"
import { ThemeLibrary } from "@/components/broadcast/theme-library"
import { DesignCanvas } from "@/components/broadcast/design-canvas"
import { PropertiesPanel } from "@/components/broadcast/properties-panel"

const LEFT_PANEL_MIN = 340
const LEFT_PANEL_MIN_COMPACT = 260
const LEFT_PANEL_MAX = 720
const RIGHT_PANEL_MIN = 280
const RIGHT_PANEL_MIN_COMPACT = 240
const RIGHT_PANEL_MAX = 560
const CANVAS_MIN = 420
const CANVAS_MIN_COMPACT = 320
const RESIZE_HANDLE_WIDTH = 10
const LEFT_WIDTH_KEY = "themeDesigner.leftPanelWidth"
const RIGHT_WIDTH_KEY = "themeDesigner.rightPanelWidth"

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function readStoredWidth(key: string, fallback: number): number {
  if (typeof window === "undefined") return fallback
  const raw = window.localStorage.getItem(key)
  const parsed = raw ? Number(raw) : NaN
  return Number.isFinite(parsed) ? parsed : fallback
}

function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  const tag = el.tagName
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  )
}

export function ThemeDesigner() {
  const isDesignerOpen = useBroadcastStore((s) => s.isDesignerOpen)
  const draftTheme = useBroadcastStore((s) => s.draftTheme)
  const isDirty = useBroadcastStore((s) => s.isDirty)
  const canUndo = useBroadcastStore((s) => s.undoStack.length > 0)
  const canRedo = useBroadcastStore((s) => s.redoStack.length > 0)
  const themes = useBroadcastStore((s) => s.themes)
  const selectedThemeSection = useBroadcastStore((s) => s.selectedThemeSection)
  const sectionThemeIds = useBroadcastStore((s) => s.sectionThemeIds)
  const layoutRef = useRef<HTMLDivElement>(null)
  const [leftPanelWidth, setLeftPanelWidth] = useState(() => readStoredWidth(LEFT_WIDTH_KEY, 360))
  const [rightPanelWidth, setRightPanelWidth] = useState(() => readStoredWidth(RIGHT_WIDTH_KEY, 340))
  const [canvasMinWidth, setCanvasMinWidth] = useState(CANVAS_MIN)
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false)
  const [confirmRevertOpen, setConfirmRevertOpen] = useState(false)

  const getPanelConstraints = useCallback((layoutWidth: number) => {
    const isCompact = layoutWidth < 1100
    const leftMin = isCompact ? LEFT_PANEL_MIN_COMPACT : LEFT_PANEL_MIN
    const rightMin = isCompact ? RIGHT_PANEL_MIN_COMPACT : RIGHT_PANEL_MIN
    const canvasMin = isCompact ? CANVAS_MIN_COMPACT : CANVAS_MIN
    const availableForSides = Math.max(
      leftMin + rightMin,
      layoutWidth - canvasMin - RESIZE_HANDLE_WIDTH * 2,
    )

    return { availableForSides, canvasMin, leftMin, rightMin }
  }, [])

  // Auto-start editing the current section default when opened if nothing is being edited.
  useEffect(() => {
    if (isDesignerOpen && !draftTheme && themes.length > 0) {
      const activeThemeId = sectionThemeIds[selectedThemeSection]
      const theme = themes.find((theme) => theme.id === activeThemeId) ?? themes[0]
      useBroadcastStore.getState().startEditing(theme.id)
    }
  }, [isDesignerOpen, draftTheme, themes, selectedThemeSection, sectionThemeIds])

  useEffect(() => {
    if (!isDesignerOpen) return

    const clampPanelWidths = () => {
      const layout = layoutRef.current
      if (!layout) return

      const layoutWidth = layout.getBoundingClientRect().width
      const { availableForSides, leftMin, rightMin } = getPanelConstraints(layoutWidth)
      setCanvasMinWidth(layoutWidth < 1100 ? CANVAS_MIN_COMPACT : CANVAS_MIN)

      setLeftPanelWidth((currentLeft) => {
        const maxLeft = Math.min(LEFT_PANEL_MAX, availableForSides - rightMin)
        return clamp(currentLeft, leftMin, Math.max(leftMin, maxLeft))
      })
      setRightPanelWidth((currentRight) => {
        const maxLeft = Math.min(LEFT_PANEL_MAX, availableForSides - currentRight)
        const clampedLeft = clamp(leftPanelWidth, leftMin, Math.max(leftMin, maxLeft))
        const maxRight = Math.min(RIGHT_PANEL_MAX, availableForSides - clampedLeft)
        return clamp(currentRight, rightMin, Math.max(rightMin, maxRight))
      })
    }

    clampPanelWidths()
    const observer = new ResizeObserver(() => clampPanelWidths())
    if (layoutRef.current) observer.observe(layoutRef.current)
    return () => observer.disconnect()
  }, [getPanelConstraints, isDesignerOpen, leftPanelWidth])

  // Persist panel widths across sessions.
  useEffect(() => {
    window.localStorage.setItem(LEFT_WIDTH_KEY, String(Math.round(leftPanelWidth)))
  }, [leftPanelWidth])
  useEffect(() => {
    window.localStorage.setItem(RIGHT_WIDTH_KEY, String(Math.round(rightPanelWidth)))
  }, [rightPanelWidth])

  const handleClose = useCallback(() => {
    useBroadcastStore.getState().setDesignerOpen(false)
  }, [])

  const handleSave = useCallback(() => {
    const draft = useBroadcastStore.getState().draftTheme
    if (!draft) return
    const wasBuiltin = draft.builtin
    useBroadcastStore.getState().saveDraft()
    if (wasBuiltin) {
      toast.success("Saved as a copy", {
        description: "Built-in themes can't be edited, so a custom copy was created.",
      })
    } else {
      toast.success("Theme saved")
    }
  }, [])

  const requestClose = useCallback(() => {
    if (useBroadcastStore.getState().isDirty) {
      setConfirmCloseOpen(true)
    } else {
      handleClose()
    }
  }, [handleClose])

  // Keyboard shortcuts (save / undo / redo) while the designer is open.
  useEffect(() => {
    if (!isDesignerOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey
      if (!mod) return
      const key = event.key.toLowerCase()

      if (key === "s") {
        event.preventDefault()
        handleSave()
        return
      }
      // Leave text-editing undo/redo to the browser when focused in a field.
      if (isEditableTarget(event.target)) return

      if (key === "z" && !event.shiftKey) {
        event.preventDefault()
        useBroadcastStore.getState().undo()
      } else if ((key === "z" && event.shiftKey) || key === "y") {
        event.preventDefault()
        useBroadcastStore.getState().redo()
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [isDesignerOpen, handleSave])

  const startPanelResize = useCallback((side: "left" | "right", event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    const layout = layoutRef.current
    if (!layout) return

    const rect = layout.getBoundingClientRect()
    const { canvasMin, leftMin, rightMin } = getPanelConstraints(rect.width)

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const maxSideWidth = Math.max(
        side === "left" ? leftMin : rightMin,
        rect.width - canvasMin - RESIZE_HANDLE_WIDTH * 2 - (side === "left" ? rightPanelWidth : leftPanelWidth),
      )

      if (side === "left") {
        setLeftPanelWidth(clamp(
          moveEvent.clientX - rect.left,
          leftMin,
          Math.min(LEFT_PANEL_MAX, maxSideWidth),
        ))
        return
      }

      setRightPanelWidth(clamp(
        rect.right - moveEvent.clientX,
        rightMin,
        Math.min(RIGHT_PANEL_MAX, maxSideWidth),
      ))
    }

    const stopResize = () => {
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", stopResize)
      window.removeEventListener("pointercancel", stopResize)
    }

    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", stopResize)
    window.addEventListener("pointercancel", stopResize)
  }, [getPanelConstraints, leftPanelWidth, rightPanelWidth])

  return (
    <DialogPrimitive.Root
      open={isDesignerOpen}
      onOpenChange={(open) => {
        // Closes are routed through requestClose so unsaved work is guarded;
        // only react to programmatic opens here.
        if (open) useBroadcastStore.getState().setDesignerOpen(true)
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />

        <DialogPrimitive.Content
          className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-background text-foreground outline-none"
          aria-describedby={undefined}
          onEscapeKeyDown={(event) => {
            event.preventDefault()
            requestClose()
          }}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <DialogPrimitive.Title className="sr-only">
            Theme Designer
          </DialogPrimitive.Title>

          {/* Top bar */}
          <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4 bg-card">
            <span className="text-xl font-semibold text-foreground">
              Theme Designer
            </span>
            {isDirty && (
              <span className="flex items-center gap-1.5 text-xs text-amber-500">
                <span className="size-1.5 rounded-full bg-amber-500" />
                Unsaved changes
              </span>
            )}

            <div className="flex-1" />

            {/* Undo / Redo */}
            <div className="flex items-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={!canUndo}
                    onClick={() => useBroadcastStore.getState().undo()}
                    aria-label="Undo"
                  >
                    <Undo2Icon className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Undo (⌘Z)</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={!canRedo}
                    onClick={() => useBroadcastStore.getState().redo()}
                    aria-label="Redo"
                  >
                    <Redo2Icon className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Redo (⌘⇧Z)</TooltipContent>
              </Tooltip>
            </div>

            <div className="mx-1 h-6 w-px bg-border" />

            <Button
              variant="outline"
              disabled={!isDirty}
              onClick={() => setConfirmRevertOpen(true)}
            >
              <RotateCcwIcon className="size-4" />
              Revert
            </Button>
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/80"
              onClick={handleSave}
            >
              <SaveIcon className="size-4" />
              Save Theme
            </Button>
            <Button variant="ghost" onClick={requestClose}>
              <XIcon strokeWidth={2} />
              Close
            </Button>
          </div>

          {/* 3-panel layout */}
          <div
            ref={layoutRef}
            className="min-h-0 min-w-0 flex-1 overflow-hidden"
            style={{
              display: "grid",
              gridTemplateColumns: `${leftPanelWidth}px ${RESIZE_HANDLE_WIDTH}px minmax(min(${canvasMinWidth}px, 100%), 1fr) ${RESIZE_HANDLE_WIDTH}px ${rightPanelWidth}px`,
            }}
          >
            {/* Left: Theme Library */}
            <ThemeLibrary />

            <div
              role="separator"
              aria-label="Resize theme library"
              aria-orientation="vertical"
              className="relative z-10 cursor-col-resize border-r border-border bg-card/30 transition-colors hover:bg-primary/20"
              onPointerDown={(event) => startPanelResize("left", event)}
            />

            {/* Center: Design Canvas */}
            <DesignCanvas />

            <div
              role="separator"
              aria-label="Resize properties panel"
              aria-orientation="vertical"
              className="relative z-10 cursor-col-resize border-l border-border bg-card/30 transition-colors hover:bg-primary/20"
              onPointerDown={(event) => startPanelResize("right", event)}
            />

            {/* Right: Properties Panel */}
            <PropertiesPanel />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>

      {/* Unsaved-changes guard on close */}
      <Dialog open={confirmCloseOpen} onOpenChange={setConfirmCloseOpen}>
        <DialogContent showCloseButton={false} className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Save changes before closing?</DialogTitle>
            <DialogDescription>
              You have unsaved changes to this theme. Save them, or discard and close the designer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmCloseOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmCloseOpen(false)
                handleClose()
              }}
            >
              Discard &amp; close
            </Button>
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/80"
              onClick={() => {
                setConfirmCloseOpen(false)
                handleSave()
                handleClose()
              }}
            >
              Save &amp; close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revert confirmation */}
      <ConfirmDialog
        open={confirmRevertOpen}
        onOpenChange={setConfirmRevertOpen}
        title="Revert changes?"
        description="This discards all edits since the theme was last saved. This can't be undone."
        confirmLabel="Revert"
        destructive
        onConfirm={() => {
          useBroadcastStore.getState().discardDraft()
          toast.success("Reverted to last saved")
        }}
      />
    </DialogPrimitive.Root>
  )
}
