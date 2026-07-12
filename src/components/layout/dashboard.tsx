import { useCallback, useEffect, useRef, useState } from "react"
import { TransportBar } from "@/components/controls/transport-bar"
import { TranscriptPanel } from "@/components/panels/transcript-panel"
import {
  MotionPanel,
  PreviewPanel,
  ThemesPanel,
} from "@/components/panels/preview-panel"
import { LiveOutputPanel } from "@/components/panels/live-output-panel"
import { QueuePanel } from "@/components/panels/queue-panel"
import { SearchPanel } from "@/components/panels/search-panel"
import { PresentationPanel } from "@/components/panels/presentation-panel"
import { useBroadcastStore } from "@/stores"

const COLUMN_MIN_WIDTHS = [300, 340, 280]
const HANDLE_WIDTH = 12
const ROW_MIN_HEIGHTS = [160, 220]
const HANDLE_HEIGHT = 12
type SearchMode = "book" | "context" | "songs" | "presentation" | "timer"

const DASHBOARD_LAYOUT_STORAGE_KEY = "fellowshow:dashboard-layout:v1"
const DEFAULT_COLUMN_RATIOS = [1.15, 1.45, 1]
const DEFAULT_MIDDLE_ROW_RATIOS = [0.7, 1.3]
const SEARCH_MODES: SearchMode[] = [
  "book",
  "context",
  "songs",
  "presentation",
  "timer",
]

interface DashboardLayoutSnapshot {
  columnRatios?: number[]
  middleRowRatios?: number[]
  layoutsByMode?: Partial<Record<SearchMode, LegacyDashboardModeLayout>>
  middleRowRatiosByMode?: Partial<Record<SearchMode, number[]>>
}

interface LegacyDashboardModeLayout {
  columnRatios: number[]
  middleRowRatios: number[]
}

type MiddleRowRatiosByMode = Record<SearchMode, number[]>

function getDefaultMiddleRowRatiosByMode(): MiddleRowRatiosByMode {
  return {
    book: [...DEFAULT_MIDDLE_ROW_RATIOS],
    context: [...DEFAULT_MIDDLE_ROW_RATIOS],
    songs: [...DEFAULT_MIDDLE_ROW_RATIOS],
    presentation: [...DEFAULT_MIDDLE_ROW_RATIOS],
    timer: [...DEFAULT_MIDDLE_ROW_RATIOS],
  }
}

function readDashboardLayout(): DashboardLayoutSnapshot {
  if (typeof window === "undefined") return {}
  if (typeof window.localStorage === "undefined") return {}

  try {
    const raw = window.localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as DashboardLayoutSnapshot
    const layoutsByMode = sanitizeLayoutsByMode(parsed.layoutsByMode)

    if (layoutsByMode) {
      return {
        columnRatios: sanitizeRatios(parsed.columnRatios, 3),
        layoutsByMode,
      }
    }

    return {
      columnRatios: sanitizeRatios(parsed.columnRatios, 3),
      middleRowRatios: sanitizeRatios(parsed.middleRowRatios, 2),
      middleRowRatiosByMode: sanitizeMiddleRowRatiosByMode(
        parsed.middleRowRatiosByMode
      ),
    }
  } catch {
    return {}
  }
}

function sanitizeRatios(
  value: unknown,
  expectedLength: number
): number[] | undefined {
  if (!Array.isArray(value) || value.length !== expectedLength) return undefined
  const ratios = value.map(Number)
  if (ratios.some((ratio) => !Number.isFinite(ratio) || ratio <= 0))
    return undefined
  return ratios
}

function sanitizeModeLayout(
  value: unknown
): LegacyDashboardModeLayout | undefined {
  if (!value || typeof value !== "object") return undefined

  const snapshot = value as DashboardLayoutSnapshot
  const columnRatios = sanitizeRatios(snapshot.columnRatios, 3)
  const middleRowRatios = sanitizeRatios(snapshot.middleRowRatios, 2)

  if (!columnRatios || !middleRowRatios) return undefined

  return { columnRatios, middleRowRatios }
}

function sanitizeLayoutsByMode(
  value: unknown
): DashboardLayoutSnapshot["layoutsByMode"] | undefined {
  if (!value || typeof value !== "object") return undefined

  const entries = Object.entries(value as Partial<Record<SearchMode, unknown>>)
  const layoutsByMode: Partial<Record<SearchMode, LegacyDashboardModeLayout>> =
    {}

  for (const [mode, layout] of entries) {
    if (!SEARCH_MODES.includes(mode as SearchMode)) continue
    const sanitized = sanitizeModeLayout(layout)
    if (sanitized) layoutsByMode[mode as SearchMode] = sanitized
  }

  return Object.keys(layoutsByMode).length > 0 ? layoutsByMode : undefined
}

function sanitizeMiddleRowRatiosByMode(
  value: unknown
): DashboardLayoutSnapshot["middleRowRatiosByMode"] | undefined {
  if (!value || typeof value !== "object") return undefined

  const entries = Object.entries(value as Partial<Record<SearchMode, unknown>>)
  const ratiosByMode: Partial<Record<SearchMode, number[]>> = {}

  for (const [mode, ratios] of entries) {
    if (!SEARCH_MODES.includes(mode as SearchMode)) continue
    const sanitized = sanitizeRatios(ratios, 2)
    if (sanitized) ratiosByMode[mode as SearchMode] = sanitized
  }

  return Object.keys(ratiosByMode).length > 0 ? ratiosByMode : undefined
}

function readColumnRatios(): number[] {
  const snapshot = readDashboardLayout()
  return (
    snapshot.columnRatios ??
    snapshot.layoutsByMode?.book?.columnRatios ??
    DEFAULT_COLUMN_RATIOS
  )
}

function readMiddleRowRatiosByMode(): MiddleRowRatiosByMode {
  const snapshot = readDashboardLayout()
  const defaults = getDefaultMiddleRowRatiosByMode()

  if (snapshot.middleRowRatiosByMode) {
    return SEARCH_MODES.reduce((ratios, mode) => {
      ratios[mode] = snapshot.middleRowRatiosByMode?.[mode] ?? defaults[mode]
      return ratios
    }, {} as MiddleRowRatiosByMode)
  }

  if (snapshot.layoutsByMode) {
    return SEARCH_MODES.reduce((ratios, mode) => {
      ratios[mode] =
        snapshot.layoutsByMode?.[mode]?.middleRowRatios ?? defaults[mode]
      return ratios
    }, {} as MiddleRowRatiosByMode)
  }

  if (snapshot.middleRowRatios) {
    return {
      ...defaults,
      book: snapshot.middleRowRatios,
    }
  }

  return defaults
}

function ResizeHandle({
  label,
  onPointerDown,
}: {
  label: string
  onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={onPointerDown}
      className="group flex min-h-0 cursor-col-resize items-stretch justify-center outline-none"
    >
      <span className="my-1 w-1 rounded-full bg-transparent transition group-hover:bg-muted-foreground/35 group-focus-visible:bg-muted-foreground/45" />
    </button>
  )
}

function RowResizeHandle({
  label,
  onPointerDown,
}: {
  label: string
  onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={onPointerDown}
      className="group flex min-w-0 cursor-row-resize items-center justify-stretch outline-none"
    >
      <span className="mx-1 h-1 flex-1 rounded-full bg-transparent transition group-hover:bg-muted-foreground/35 group-focus-visible:bg-muted-foreground/45" />
    </button>
  )
}

export function Dashboard() {
  const gridRef = useRef<HTMLDivElement>(null)
  const middleColumnRef = useRef<HTMLDivElement>(null)
  const [columnRatios, setColumnRatios] = useState(readColumnRatios)
  const [middleRowRatiosByMode, setMiddleRowRatiosByMode] = useState(
    readMiddleRowRatiosByMode
  )
  const [searchMode, setSearchMode] = useState<SearchMode>("book")
  const middleRowRatios = middleRowRatiosByMode[searchMode]

  useEffect(() => {
    if (typeof window.localStorage === "undefined") return

    const timeout = window.setTimeout(() => {
      window.localStorage.setItem(
        DASHBOARD_LAYOUT_STORAGE_KEY,
        JSON.stringify({ columnRatios, middleRowRatiosByMode })
      )
    }, 150)

    return () => window.clearTimeout(timeout)
  }, [columnRatios, middleRowRatiosByMode])

  const startColumnResize = useCallback(
    (handleIndex: 0 | 1, event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)

      const grid = gridRef.current
      if (!grid) return

      const startX = event.clientX
      const availableWidth = grid.clientWidth - HANDLE_WIDTH * 2
      const ratioTotal = columnRatios.reduce((sum, ratio) => sum + ratio, 0)
      const startWidths = columnRatios.map(
        (ratio) => (ratio / ratioTotal) * availableWidth
      )

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const delta = moveEvent.clientX - startX
        const nextWidths = [...startWidths]
        const leftIndex = handleIndex
        const rightIndex = handleIndex + 1
        const pairWidth = startWidths[leftIndex] + startWidths[rightIndex]

        const nextLeft = Math.min(
          Math.max(
            startWidths[leftIndex] + delta,
            COLUMN_MIN_WIDTHS[leftIndex]
          ),
          pairWidth - COLUMN_MIN_WIDTHS[rightIndex]
        )

        nextWidths[leftIndex] = nextLeft
        nextWidths[rightIndex] = pairWidth - nextLeft
        setColumnRatios(nextWidths)
      }

      const stopResize = () => {
        window.removeEventListener("pointermove", handlePointerMove)
        window.removeEventListener("pointerup", stopResize)
        window.removeEventListener("pointercancel", stopResize)
      }

      window.addEventListener("pointermove", handlePointerMove)
      window.addEventListener("pointerup", stopResize)
      window.addEventListener("pointercancel", stopResize)
    },
    [columnRatios]
  )

  const startMiddleRowResize = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)

      const column = middleColumnRef.current
      if (!column) return

      const startY = event.clientY
      const availableHeight = column.clientHeight - HANDLE_HEIGHT
      const ratioTotal = middleRowRatios.reduce((sum, ratio) => sum + ratio, 0)
      const startHeights = middleRowRatios.map(
        (ratio) => (ratio / ratioTotal) * availableHeight
      )
      const pairHeight = startHeights[0] + startHeights[1]

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const delta = moveEvent.clientY - startY
        const maxTop = Math.max(
          ROW_MIN_HEIGHTS[0],
          pairHeight - ROW_MIN_HEIGHTS[1]
        )
        const nextTop = Math.min(
          Math.max(startHeights[0] + delta, ROW_MIN_HEIGHTS[0]),
          maxTop
        )

        setMiddleRowRatiosByMode((current) => ({
          ...current,
          [searchMode]: [nextTop, pairHeight - nextTop],
        }))
      }

      const stopResize = () => {
        window.removeEventListener("pointermove", handlePointerMove)
        window.removeEventListener("pointerup", stopResize)
        window.removeEventListener("pointercancel", stopResize)
      }

      window.addEventListener("pointermove", handlePointerMove)
      window.addEventListener("pointerup", stopResize)
      window.addEventListener("pointercancel", stopResize)
    },
    [middleRowRatios, searchMode]
  )

  const handleSearchModeChange = useCallback((mode: SearchMode) => {
    setSearchMode(mode)
    const section =
      mode === "songs"
        ? "songs"
        : mode === "presentation"
          ? "presentation"
          : "bible"
    const broadcastStore = useBroadcastStore.getState()
    broadcastStore.setSelectedThemeSection(section)

    // Content selection should stage into preview by default. The operator can
    // still enable Auto from the preview panel when they explicitly want it.
    if (mode !== "timer") {
      broadcastStore.setAutoPreviewToLive(false)
    }
  }, [])

  return (
    <div
      style={{
        position: "fixed",
        inset: "0px",
        display: "grid",
        gridTemplateRows: "56px minmax(0, 1fr)",
        overflow: "hidden",
      }}
      className="bg-background"
    >
      <div>
        <TransportBar />
      </div>

      <div
        ref={gridRef}
        className="grid min-h-0 p-3 *:min-h-0"
        style={{
          gridTemplateColumns: `minmax(${COLUMN_MIN_WIDTHS[0]}px, ${columnRatios[0]}fr) ${HANDLE_WIDTH}px minmax(${COLUMN_MIN_WIDTHS[1]}px, ${columnRatios[1]}fr) ${HANDLE_WIDTH}px minmax(${COLUMN_MIN_WIDTHS[2]}px, ${columnRatios[2]}fr)`,
        }}
      >
        <SearchPanel onSearchModeChange={handleSearchModeChange} />
        <ResizeHandle
          label="Resize search and transcript columns"
          onPointerDown={(event) => startColumnResize(0, event)}
        />

        {searchMode === "presentation" ? (
          <div className="grid min-h-0 *:min-h-0">
            <PresentationPanel />
          </div>
        ) : (
          <div
            ref={middleColumnRef}
            className="grid min-h-0 *:min-h-0"
            style={{
              gridTemplateRows: `minmax(${ROW_MIN_HEIGHTS[0]}px, ${middleRowRatios[0]}fr) ${HANDLE_HEIGHT}px minmax(${ROW_MIN_HEIGHTS[1]}px, ${middleRowRatios[1]}fr)`,
            }}
          >
            <TranscriptPanel />
            <RowResizeHandle
              label="Resize transcript and queue rows"
              onPointerDown={startMiddleRowResize}
            />
            <QueuePanel mode={searchMode} />
          </div>
        )}
        <ResizeHandle
          label="Resize transcript and display columns"
          onPointerDown={(event) => startColumnResize(1, event)}
        />

        <div className="flex h-full min-h-0 [scrollbar-width:thin] flex-col items-stretch gap-3 overflow-y-auto overscroll-contain pr-1 *:min-h-0">
          <LiveOutputPanel mode={searchMode} />
          <PreviewPanel mode={searchMode} />
          {searchMode !== "timer" && searchMode !== "presentation" && (
            <ThemesPanel mode={searchMode} />
          )}
          {searchMode !== "timer" && <MotionPanel mode={searchMode} />}
        </div>
      </div>
    </div>
  )
}
