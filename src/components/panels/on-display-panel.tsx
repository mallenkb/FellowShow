import { useState } from "react"
import { OverlaySamplePreviewDialog } from "@/components/on-display/overlay-sample-preview-dialog"
import { AddGraphicDialog } from "@/components/on-display/add-graphic-dialog"
import { OverlayEditorDialog } from "@/components/on-display/overlay-editor-dialog"
import { OverlayAppearanceDialog } from "@/components/on-display/overlay-appearance-dialog"
import { DskOutputControls } from "@/components/on-display/dsk-output-controls"
import { OverlayLiveControls } from "@/components/on-display/overlay-live-controls"
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

export function OnDisplayPanel({
  onPreviewRequest,
}: {
  onPreviewRequest?: () => void
}) {
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
    <div className="flex min-h-0 flex-col overflow-hidden bg-card">
      <div className="@container/overlay shrink-0 bg-surface-header">
        <DskOutputControls
          onPreviewRequest={onPreviewRequest}
          onAppearanceRequest={() => {
            setAppearanceKey((key) => key + 1)
            setAppearanceOpen(true)
          }}
          onSamplePreviewRequest={() => setSamplePreviewOpen(true)}
        />
      </div>
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
          onPreviewRequest={onPreviewRequest}
          compact
        />
      </div>
      <OverlayLiveControls />
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
