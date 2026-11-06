import type { PointerEvent, RefObject } from "react"
import { DashboardResizeHandle } from "@/components/layout/dashboard-resize-handle"
import { PreachingSummaryPanel } from "@/components/panels/preaching-summary-panel"
import { SermonScripturesPanel } from "@/components/panels/sermon-scriptures-panel"
import { SongsQueuePanel } from "@/components/panels/songs-queue-panel"

type QueuePanelMode = "book" | "context" | "songs" | "presentation"

export function QueuePanel({
  mode,
  isActive = true,
  splitRef,
  rowTemplate,
  onResizeStart,
  onResizeNudge,
}: {
  mode: QueuePanelMode
  isActive?: boolean
  splitRef: RefObject<HTMLDivElement | null>
  rowTemplate: string
  onResizeStart: (event: PointerEvent<HTMLButtonElement>) => void
  onResizeNudge: (amount: number) => void
}) {
  if (mode === "songs") return <SongsQueuePanel />

  return (
    <div
      data-slot="queue-panel"
      className="min-h-0 [scrollbar-width:thin] overflow-y-auto"
    >
      <div
        ref={splitRef}
        className="grid h-full min-h-[24.25rem]"
        style={{ gridTemplateRows: rowTemplate }}
      >
        <section
          aria-label="Sermon scriptures"
          className="flex min-h-0 flex-col overflow-hidden bg-card"
        >
          <SermonScripturesPanel isActive={isActive} />
        </section>
        <DashboardResizeHandle
          direction="row"
          label="Resize sermon scriptures and sermon notes"
          onPointerDown={onResizeStart}
          onNudge={onResizeNudge}
        />
        <section
          aria-label="Sermon notes"
          className="flex min-h-0 flex-col overflow-hidden bg-card"
        >
          <PreachingSummaryPanel isActive={isActive} />
        </section>
      </div>
    </div>
  )
}
