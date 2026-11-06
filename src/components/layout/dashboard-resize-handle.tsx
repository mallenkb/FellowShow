import type { PointerEvent } from "react"

export function DashboardResizeHandle({
  label,
  direction = "column",
  isHidden = false,
  onPointerDown,
  onNudge,
}: {
  label: string
  direction?: "column" | "row"
  isHidden?: boolean
  onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void
  onNudge: (amount: number) => void
}) {
  const column = direction === "column"
  return (
    <button
      type="button"
      aria-label={label}
      aria-hidden={isHidden || undefined}
      disabled={isHidden}
      tabIndex={isHidden ? -1 : undefined}
      title="Drag or use arrow keys to resize"
      onPointerDown={onPointerDown}
      onKeyDown={(event) => {
        const backward = column ? "ArrowLeft" : "ArrowUp"
        const forward = column ? "ArrowRight" : "ArrowDown"
        if (event.key !== backward && event.key !== forward) return
        event.preventDefault()
        onNudge((event.key === backward ? -1 : 1) * (event.shiftKey ? 40 : 10))
      }}
      className={
        (isHidden ? "pointer-events-none invisible " : "") +
        (column
          ? "group relative z-10 flex min-h-0 cursor-col-resize touch-none items-center justify-center bg-background outline-none"
          : "group relative z-10 flex min-w-0 cursor-row-resize touch-none items-center justify-center bg-background outline-none")
      }
    >
      <span
        aria-hidden="true"
        className={
          column
            ? "absolute -inset-x-2 inset-y-0"
            : "absolute inset-x-0 -inset-y-2"
        }
      />
      <span
        className={
          column
            ? "relative h-14 max-h-full w-1 rounded-full bg-transparent transition group-hover:bg-muted-foreground/60 group-focus-visible:bg-muted-foreground/80"
            : "relative h-1 w-14 max-w-full rounded-full bg-transparent transition group-hover:bg-muted-foreground/60 group-focus-visible:bg-muted-foreground/80"
        }
      />
    </button>
  )
}
