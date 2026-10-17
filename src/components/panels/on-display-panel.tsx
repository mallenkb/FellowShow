import { useState } from "react"
import { LayersIcon, PaletteIcon, VideoIcon } from "lucide-react"
import { OverlaySamplePreviewDialog } from "@/components/on-display/overlay-sample-preview-dialog"
import { Button } from "@/components/ui/button"
import { PanelHeader } from "@/components/ui/panel-header"
import { BarOverlayDialog } from "@/components/on-display/bar-overlay-dialog"
import { AddGraphicDialog } from "@/components/on-display/add-graphic-dialog"
import {
  OverlayEditorDialog,
  type OverlayEditorKind,
} from "@/components/on-display/overlay-editor-dialog"
import { OverlayAppearanceDialog } from "@/components/on-display/overlay-appearance-dialog"
import {
  OverlayPads,
  type OverlayPadKind,
} from "@/components/on-display/overlay-pads"

interface EditorState {
  open: boolean
  id: string | null
  /** Remounts the editor so every opening starts from saved values. */
  key: number
}

const CLOSED: EditorState = { open: false, id: null, key: 0 }

export function OnDisplayPanel() {
  const [samplePreviewOpen, setSamplePreviewOpen] = useState(false)
  const [appearanceOpen, setAppearanceOpen] = useState(false)
  const [appearanceKey, setAppearanceKey] = useState(0)
  const [barEditor, setBarEditor] = useState<EditorState>(CLOSED)
  const [editor, setEditor] = useState<{
    kind: OverlayEditorKind
    id: string | null
    key: number
  } | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const openEditor = (kind: OverlayEditorKind, id: string | null) =>
    setEditor((state) => ({ kind, id, key: (state?.key ?? 0) + 1 }))

  const openBar = (id: string | null) =>
    setBarEditor((state) => ({ open: true, id, key: state.key + 1 }))

  const editPad = (kind: OverlayPadKind, id: string) => {
    if (kind === "bar") openBar(id)
    else openEditor(kind, id)
  }
  const addGraphic = (kind: OverlayPadKind) => {
    if (kind === "bar") openBar(null)
    else openEditor(kind, null)
  }

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card">
      <PanelHeader
        title="Overlay pads"
        icon={<LayersIcon className="size-3.5" />}
      >
        <span className="hidden items-center gap-1 text-[0.6875rem] text-muted-foreground lg:flex">
          <kbd className="rounded border border-border px-1 font-mono">1</kbd>
          to
          <kbd className="rounded border border-border px-1 font-mono">9</kbd>
          toggle pads
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setAppearanceKey((key) => key + 1)
            setAppearanceOpen(true)
          }}
        >
          <PaletteIcon /> Appearance
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Test over sample video"
          title="Test over sample video"
          onClick={() => setSamplePreviewOpen(true)}
        >
          <VideoIcon />
        </Button>
      </PanelHeader>
      <OverlaySamplePreviewDialog
        open={samplePreviewOpen}
        onOpenChange={setSamplePreviewOpen}
      />
      <OverlayAppearanceDialog
        key={`appearance-${appearanceKey}`}
        open={appearanceOpen}
        onOpenChange={setAppearanceOpen}
      />
      <div className="min-h-0 flex-1 [scrollbar-width:thin] space-y-3 overflow-y-auto p-3">
        <OverlayPads onAddRequest={() => setAddOpen(true)} onEdit={editPad} />
      </div>
      <AddGraphicDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onPick={addGraphic}
      />
      <OverlayEditorDialog
        key={`editor-${editor?.key ?? 0}`}
        kind={editor?.kind ?? null}
        editId={editor?.id ?? null}
        onOpenChange={(open) => {
          if (!open) setEditor(null)
        }}
      />
      <BarOverlayDialog
        key={`bar-${barEditor.key}`}
        barId={barEditor.id}
        open={barEditor.open}
        onOpenChange={(open) => setBarEditor((state) => ({ ...state, open }))}
      />
    </div>
  )
}
