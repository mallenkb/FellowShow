export type OutputType = "display" | "ndi"

/**
 * Pick a monitor not already claimed by another output, preferring external
 * displays so outputs land on projectors and stage displays before the
 * operator's primary screen. Returns null when every monitor is taken.
 */
export function selectFreeMonitorIndex(
  monitors: Array<{ isPrimary: boolean }>,
  takenIndices: Iterable<number>
): number | null {
  const taken = new Set(takenIndices)
  const externalIndex = monitors.findIndex(
    (monitor, index) => !taken.has(index) && !monitor.isPrimary
  )
  if (externalIndex >= 0) return externalIndex
  const anyIndex = monitors.findIndex((_, index) => !taken.has(index))
  return anyIndex >= 0 ? anyIndex : null
}
