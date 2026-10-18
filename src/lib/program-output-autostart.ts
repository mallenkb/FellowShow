import {
  isOutputOn,
  setOutputEnabled,
  useOutputRuntimeStore,
  type OutputRuntime,
} from "@/lib/broadcast-output-runtime"
import type { BroadcastOutputConfig } from "@/lib/broadcast-outputs"
import { useBroadcastStore } from "@/stores/broadcast-store"

/** A display can open without asking: NDI, or a screen already chosen. */
function isReady(output: BroadcastOutputConfig): boolean {
  return output.outputType === "ndi" || output.monitorIndex !== null
}

/**
 * The display to switch on when something goes live and no program display is
 * on: the first ready General display, else the first General one, else the
 * first ready display of any other program role. Graphics outputs never count.
 */
export function pickProgramOutputToStart(
  outputs: readonly BroadcastOutputConfig[],
  runtimeById: Record<string, OutputRuntime | undefined>
): BroadcastOutputConfig | null {
  const program = outputs.filter((output) => output.content !== "overlays")
  if (program.some((output) => isOutputOn(runtimeById[output.id]))) return null
  const general = program.filter((output) => output.content === "everything")
  return general.find(isReady) ?? general[0] ?? program.find(isReady) ?? null
}

let starting = false

/**
 * Going live (a double-click, Show on Live, or the Program switch) opens a
 * display when none is on, so the operator always sees the result.
 */
export function initProgramOutputAutostart(): () => void {
  return useBroadcastStore.subscribe((state, previous) => {
    const wentLive = state.isLive && !previous.isLive
    const newContent = state.isLive && state.liveVerse !== previous.liveVerse
    if ((!wentLive && !newContent) || starting) return
    const output = pickProgramOutputToStart(
      state.outputs,
      useOutputRuntimeStore.getState().byId
    )
    if (!output) return
    starting = true
    void setOutputEnabled(output, true)
      .catch((error: unknown) => {
        console.error("[outputs] Could not open a display for Live", error)
      })
      .finally(() => {
        starting = false
      })
  })
}
