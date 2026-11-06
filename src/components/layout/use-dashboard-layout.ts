import { useCallback, useEffect, useRef, useState } from "react"
import type { PointerEvent as ReactPointerEvent } from "react"

const STORAGE_KEY = "fellowshow:dashboard-layout:v2"
const LEGACY_STORAGE_KEY = "fellowshow:dashboard-layout:v1"
const COLUMN_MIN_WIDTHS = [235, 205, 220, 235]
const FOCUSED_COLUMN_MIN_WIDTHS = [235, 360, 235]
const HANDLE_SIZE = 4
const ROW_MIN_HEIGHTS = [150, 245] as const
const QUEUE_ROW_MIN_HEIGHTS = [144, 240] as const
const DEFAULT_COLUMNS = [1.15, 1, 0.9, 1.15]
const DEFAULT_FOCUSED_COLUMNS = [
  DEFAULT_COLUMNS[0],
  DEFAULT_COLUMNS[1] + DEFAULT_COLUMNS[2],
  DEFAULT_COLUMNS[3],
]
const DEFAULT_ROWS = [0.85, 1.15]
const DEFAULT_QUEUE_ROWS = [1, 1]

type RowSplit = "middle" | "queue"
type FocusedWorkspace = "media" | "overlays"

interface DashboardLayout {
  columnRatios: number[]
  focusedColumnRatios: number[]
  rowRatios: number[]
  queueRowRatios: number[]
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {}
}

function ratios(value: unknown, count: number): number[] | undefined {
  if (!Array.isArray(value) || value.length !== count) return undefined
  if (
    value.some(
      (item) => typeof item !== "number" || !Number.isFinite(item) || item <= 0
    )
  ) {
    return undefined
  }
  return value as number[]
}

function measureColumns(
  grid: HTMLDivElement,
  focusedWorkspace: FocusedWorkspace | null
): number[] {
  // The two middle panels stay mounted while one track collapses in focused views.
  const childIndices = focusedWorkspace
    ? [0, focusedWorkspace === "media" ? 4 : 2, 6]
    : [0, 2, 4, 6]
  return childIndices.map(
    (childIndex) =>
      grid.children[childIndex]?.getBoundingClientRect().width ?? 0
  )
}

function resizeColumns(
  columns: number[],
  index: 0 | 1 | 2,
  delta: number,
  minWidths: number[]
) {
  const pairWidth = columns[index] + columns[index + 1]
  if (!Number.isFinite(pairWidth) || pairWidth <= 0) return null
  const minLeft = minWidths[index]
  const maxLeft = Math.max(minLeft, pairWidth - minWidths[index + 1])
  const left = Math.min(Math.max(columns[index] + delta, minLeft), maxLeft)
  const next = [...columns]
  next[index] = left
  next[index + 1] = pairWidth - left
  return next
}

function resizeRows(
  top: number,
  bottom: number,
  delta: number,
  minHeights: readonly [number, number]
) {
  const total = top + bottom
  if (total <= 0) return null
  const maxTop = Math.max(minHeights[0], total - minHeights[1])
  const nextTop = Math.min(Math.max(top + delta, minHeights[0]), maxTop)
  return [nextTop, total - nextTop]
}

function readLayout(): DashboardLayout {
  const fallback = {
    columnRatios: DEFAULT_COLUMNS,
    focusedColumnRatios: DEFAULT_FOCUSED_COLUMNS,
    rowRatios: DEFAULT_ROWS,
    queueRowRatios: DEFAULT_QUEUE_ROWS,
  }
  try {
    const raw =
      window.localStorage.getItem(STORAGE_KEY) ??
      window.localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) return fallback
    const saved = record(JSON.parse(raw) as unknown)
    const bookLayout = record(record(saved.layoutsByMode).book)
    const legacyColumns =
      ratios(saved.columnRatios, 3) ?? ratios(bookLayout.columnRatios, 3)
    const migratedColumns = legacyColumns
      ? [
          legacyColumns[0],
          legacyColumns[1] / 2,
          legacyColumns[1] / 2,
          legacyColumns[2],
        ]
      : undefined
    const legacyRows = record(saved.middleRowRatiosByMode).book
    const columnRatios =
      ratios(saved.columnRatios, 4) ?? migratedColumns ?? DEFAULT_COLUMNS
    return {
      columnRatios,
      focusedColumnRatios: ratios(saved.focusedColumnRatios, 3) ?? [
        columnRatios[0],
        columnRatios[1] + columnRatios[2],
        columnRatios[3],
      ],
      rowRatios:
        ratios(saved.rowRatios, 2) ??
        ratios(legacyRows, 2) ??
        ratios(saved.middleRowRatios, 2) ??
        ratios(bookLayout.middleRowRatios, 2) ??
        DEFAULT_ROWS,
      queueRowRatios: ratios(saved.queueRowRatios, 2) ?? DEFAULT_QUEUE_ROWS,
    }
  } catch {
    return fallback
  }
}

export function useDashboardLayout() {
  const gridRef = useRef<HTMLDivElement>(null)
  const middleRef = useRef<HTMLDivElement>(null)
  const queueRef = useRef<HTMLDivElement>(null)
  const cleanupRef = useRef<(() => void) | null>(null)
  const [layout, setLayout] = useState(readLayout)

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(layout))
      } catch (error) {
        console.error("[dashboard] Could not save layout", error)
      }
    }, 150)
    return () => window.clearTimeout(timeout)
  }, [layout])

  useEffect(() => () => cleanupRef.current?.(), [])

  const startColumnResize = useCallback(
    (
      index: 0 | 1 | 2,
      event: ReactPointerEvent<HTMLButtonElement>,
      focusedWorkspace: FocusedWorkspace | null = null
    ) => {
      const grid = gridRef.current
      if (!grid) return
      const columns = measureColumns(grid, focusedWorkspace)
      const minWidths = focusedWorkspace
        ? FOCUSED_COLUMN_MIN_WIDTHS
        : COLUMN_MIN_WIDTHS
      const pairWidth = columns[index] + columns[index + 1]
      if (!Number.isFinite(pairWidth) || pairWidth <= 0) return

      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)
      cleanupRef.current?.()
      const pointerId = event.pointerId
      const startX = event.clientX
      const onMove = (move: PointerEvent) => {
        if (move.pointerId !== pointerId) return
        const next = resizeColumns(
          columns,
          index,
          move.clientX - startX,
          minWidths
        )
        if (next) {
          setLayout((current) =>
            focusedWorkspace
              ? { ...current, focusedColumnRatios: next }
              : { ...current, columnRatios: next }
          )
        }
      }
      const stop = () => {
        window.removeEventListener("pointermove", onMove)
        window.removeEventListener("pointerup", stop)
        window.removeEventListener("pointercancel", stop)
        cleanupRef.current = null
      }
      cleanupRef.current = stop
      window.addEventListener("pointermove", onMove)
      window.addEventListener("pointerup", stop)
      window.addEventListener("pointercancel", stop)
    },
    []
  )

  const startRowResize = useCallback(
    (split: RowSplit, event: ReactPointerEvent<HTMLButtonElement>) => {
      const column = split === "queue" ? queueRef.current : middleRef.current
      if (!column) return
      const minHeights =
        split === "queue" ? QUEUE_ROW_MIN_HEIGHTS : ROW_MIN_HEIGHTS
      const top = column.children[0]?.getBoundingClientRect().height ?? 0
      const bottom = column.children[2]?.getBoundingClientRect().height ?? 0
      const pairHeight = top + bottom
      if (pairHeight <= 0) return

      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)
      cleanupRef.current?.()
      const pointerId = event.pointerId
      const startY = event.clientY
      const onMove = (move: PointerEvent) => {
        if (move.pointerId !== pointerId) return
        const next = resizeRows(top, bottom, move.clientY - startY, minHeights)
        if (next) {
          setLayout((current) =>
            split === "queue"
              ? { ...current, queueRowRatios: next }
              : { ...current, rowRatios: next }
          )
        }
      }
      const stop = () => {
        window.removeEventListener("pointermove", onMove)
        window.removeEventListener("pointerup", stop)
        window.removeEventListener("pointercancel", stop)
        cleanupRef.current = null
      }
      cleanupRef.current = stop
      window.addEventListener("pointermove", onMove)
      window.addEventListener("pointerup", stop)
      window.addEventListener("pointercancel", stop)
    },
    []
  )

  const nudgeColumn = useCallback(
    (
      index: 0 | 1 | 2,
      delta: number,
      focusedWorkspace: FocusedWorkspace | null = null
    ) => {
      const grid = gridRef.current
      if (!grid) return
      const next = resizeColumns(
        measureColumns(grid, focusedWorkspace),
        index,
        delta,
        focusedWorkspace ? FOCUSED_COLUMN_MIN_WIDTHS : COLUMN_MIN_WIDTHS
      )
      if (next) {
        setLayout((current) =>
          focusedWorkspace
            ? { ...current, focusedColumnRatios: next }
            : { ...current, columnRatios: next }
        )
      }
    },
    []
  )

  const nudgeRow = useCallback((split: RowSplit, delta: number) => {
    const column = split === "queue" ? queueRef.current : middleRef.current
    if (!column) return
    const top = column.children[0]?.getBoundingClientRect().height ?? 0
    const bottom = column.children[2]?.getBoundingClientRect().height ?? 0
    const minHeights =
      split === "queue" ? QUEUE_ROW_MIN_HEIGHTS : ROW_MIN_HEIGHTS
    const next = resizeRows(top, bottom, delta, minHeights)
    if (next) {
      setLayout((current) =>
        split === "queue"
          ? { ...current, queueRowRatios: next }
          : { ...current, rowRatios: next }
      )
    }
  }, [])

  const columnTemplate = COLUMN_MIN_WIDTHS.map(
    (width, index) => `minmax(${width}px, ${layout.columnRatios[index]}fr)`
  ).join(` ${HANDLE_SIZE}px `)
  const focusedColumns = FOCUSED_COLUMN_MIN_WIDTHS.map(
    (width, index) =>
      `minmax(${width}px, ${layout.focusedColumnRatios[index]}fr)`
  )
  const mediaColumnTemplate = `${focusedColumns[0]} ${HANDLE_SIZE}px 0px 0px ${focusedColumns[1]} ${HANDLE_SIZE}px ${focusedColumns[2]}`
  const overlayColumnTemplate = `${focusedColumns[0]} ${HANDLE_SIZE}px ${focusedColumns[1]} 0px 0px ${HANDLE_SIZE}px ${focusedColumns[2]}`
  const rowTemplate = `minmax(${ROW_MIN_HEIGHTS[0]}px, ${layout.rowRatios[0]}fr) ${HANDLE_SIZE}px minmax(${ROW_MIN_HEIGHTS[1]}px, ${layout.rowRatios[1]}fr)`
  const queueRowTemplate = `minmax(${QUEUE_ROW_MIN_HEIGHTS[0]}px, ${layout.queueRowRatios[0]}fr) ${HANDLE_SIZE}px minmax(${QUEUE_ROW_MIN_HEIGHTS[1]}px, ${layout.queueRowRatios[1]}fr)`

  return {
    gridRef,
    middleRef,
    queueRef,
    columnTemplate,
    mediaColumnTemplate,
    overlayColumnTemplate,
    rowTemplate,
    queueRowTemplate,
    startColumnResize,
    startRowResize,
    nudgeColumn,
    nudgeRow,
  }
}
