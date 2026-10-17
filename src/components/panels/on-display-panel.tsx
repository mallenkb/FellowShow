import { useState } from "react"
import { LayersIcon, PaletteIcon, VideoIcon } from "lucide-react"
import { OverlaySamplePreviewDialog } from "@/components/on-display/overlay-sample-preview-dialog"
import { Button } from "@/components/ui/button"
import { PanelHeader } from "@/components/ui/panel-header"
import { AddGraphicDialog } from "@/components/on-display/add-graphic-dialog"
import { OverlayEditorDialog } from "@/components/on-display/overlay-editor-dialog"
import { OverlayAppearanceDialog } from "@/components/on-display/overlay-appearance-dialog"
import {
  OverlayPads,
  type OverlayPadKind,
} from "@/components/on-display/overlay-pads"

interface EditorState {
  kind: OverlayPadKind
  /** The graphic being edited; null adds a new one. */
  id: string | null
  /** Remounts the editor so every opening starts from saved values. */
  key: number
}

export function OnDisplayPanel() {
  const [samplePreviewOpen, setSamplePreviewOpen] = useState(false)
  const [appearanceOpen, setAppearanceOpen] = useState(false)
  const [appearanceKey, setAppearanceKey] = useState(0)
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [editorKey, setEditorKey] = useState(0)
  const [addOpen, setAddOpen] = useState(false)
  const openEditor = (kind: OverlayPadKind, id: string | null) => {
    setEditorKey((key) => key + 1)
    setEditor({ kind, id, key: editorKey + 1 })
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
        <OverlayPads
          onAddRequest={() => setAddOpen(true)}
          onEdit={openEditor}
        />
      </div>
      <AddGraphicDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onPick={(kind) => openEditor(kind, null)}
      />
      {editor ? (
        <OverlayEditorDialog
          key={editor.key}
          kind={editor.kind}
          id={editor.id}
          onClose={() => setEditor(null)}
        />
      ) : null}
    </div>
  )
}
