import type { MonitorInfo } from "@/lib/ipc"

/**
 * What an output remembers about its screen, so it finds the same screen after
 * a replug or restart even when the operating system lists screens in a new
 * order. Monitor names come from the OS (the display ID on macOS, the device
 * name on Windows) and positions come from the OS display arrangement, which
 * both survive reconnects far better than a list position does.
 */
export interface ScreenIdentity {
  name: string
  x: number
  y: number
  width: number
  height: number
}

type MonitorLike = Pick<
  MonitorInfo,
  "index" | "name" | "x" | "y" | "width" | "height" | "isPrimary"
>

export function screenIdentityFor(monitor: MonitorLike): ScreenIdentity {
  return {
    name: monitor.name,
    x: monitor.x,
    y: monitor.y,
    width: monitor.width,
    height: monitor.height,
  }
}

export function sanitizeScreenIdentity(raw: unknown): ScreenIdentity | null {
  if (typeof raw !== "object" || raw === null) return null
  const candidate = raw as Record<string, unknown>
  const isInt = (value: unknown): value is number =>
    typeof value === "number" && Number.isSafeInteger(value)
  if (
    typeof candidate.name !== "string" ||
    candidate.name.length === 0 ||
    !isInt(candidate.x) ||
    !isInt(candidate.y) ||
    !isInt(candidate.width) ||
    !isInt(candidate.height) ||
    candidate.width <= 0 ||
    candidate.height <= 0
  ) {
    return null
  }
  return {
    name: candidate.name,
    x: candidate.x,
    y: candidate.y,
    width: candidate.width,
    height: candidate.height,
  }
}

/** The label the operator sees for a screen, matching Identify. */
export function screenLabel(monitor: Pick<MonitorInfo, "index" | "isPrimary">) {
  return monitor.isPrimary ? "Laptop" : `Screen ${monitor.index + 1}`
}

export type ScreenResolution<M extends MonitorLike> =
  | { kind: "found"; monitor: M }
  | { kind: "missing"; screen: ScreenIdentity | null }
  | { kind: "unset" }

function onlyMatch<M>(monitors: readonly M[], test: (m: M) => boolean) {
  const matches = monitors.filter(test)
  return matches.length === 1 ? matches[0] : null
}

/**
 * Find the screen an output was set to. A saved identity wins over the saved
 * list position: first the same name at the same position, then a name that
 * only one screen has, then the only screen at that position and size. When
 * none of those match, the screen is missing and the operator must choose, so
 * two outputs never swap screens silently.
 */
export function resolveOutputScreen<M extends MonitorLike>(
  output: { monitorIndex: number | null; screen?: ScreenIdentity | null },
  monitors: readonly M[]
): ScreenResolution<M> {
  const saved = output.screen ?? null
  if (saved) {
    const found =
      onlyMatch(
        monitors,
        (m) => m.name === saved.name && m.x === saved.x && m.y === saved.y
      ) ??
      onlyMatch(monitors, (m) => m.name === saved.name) ??
      onlyMatch(
        monitors,
        (m) =>
          m.x === saved.x &&
          m.y === saved.y &&
          m.width === saved.width &&
          m.height === saved.height
      )
    return found
      ? { kind: "found", monitor: found }
      : { kind: "missing", screen: saved }
  }
  if (output.monitorIndex === null) return { kind: "unset" }
  const legacy = monitors.find((m) => m.index === output.monitorIndex)
  return legacy
    ? { kind: "found", monitor: legacy }
    : { kind: "missing", screen: null }
}

export interface ScreenAssignment {
  monitorIndex: number | null
  screen: ScreenIdentity | null
}

/**
 * Bring saved outputs in line with the screens connected now. Outputs whose
 * screen moved in the list get its new position, outputs saved before screens
 * had identities gain one, and outputs whose screen is gone lose their
 * position but keep their identity, so the screen picker asks the operator.
 * Returns only the outputs that change.
 */
export function reconcileOutputScreens<M extends MonitorLike>(
  outputs: ReadonlyArray<{
    id: string
    outputType: string
    monitorIndex: number | null
    screen?: ScreenIdentity | null
  }>,
  monitors: readonly M[]
): Record<string, ScreenAssignment> {
  const changes: Record<string, ScreenAssignment> = {}
  if (monitors.length === 0) return changes
  for (const output of outputs) {
    if (output.outputType !== "display") continue
    const resolved = resolveOutputScreen(output, monitors)
    if (resolved.kind === "found") {
      const screen = screenIdentityFor(resolved.monitor)
      const saved = output.screen ?? null
      if (
        output.monitorIndex !== resolved.monitor.index ||
        !saved ||
        !sameScreen(saved, screen)
      ) {
        changes[output.id] = { monitorIndex: resolved.monitor.index, screen }
      }
    } else if (resolved.kind === "missing" && output.monitorIndex !== null) {
      changes[output.id] = { monitorIndex: null, screen: resolved.screen }
    }
  }
  return changes
}

function sameScreen(a: ScreenIdentity, b: ScreenIdentity): boolean {
  return (
    a.name === b.name &&
    a.x === b.x &&
    a.y === b.y &&
    a.width === b.width &&
    a.height === b.height
  )
}
