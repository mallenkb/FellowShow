import {
  isOutputOn,
  setOutputEnabled,
  useOutputRuntimeStore,
} from "@/lib/broadcast-output-runtime"
import type { BroadcastOutputConfig } from "@/lib/broadcast-outputs"
import { useBroadcastStore } from "@/stores"

/** The Video Overlays output the operator picked, else the first one. */
export function resolveOverlayOutput(
  outputs: readonly BroadcastOutputConfig[],
  selectedOutputId: string | null
): BroadcastOutputConfig | null {
  return (
    outputs.find(
      (output) =>
        output.id === selectedOutputId && output.content === "overlays"
    ) ??
    outputs.find((output) => output.content === "overlays") ??
    null
  )
}

/**
 * Copies the Preview selection to the live graphics and puts the output on
 * air if it is not already. Returns false when the output could not start;
 * the output runtime reports that failure with its own toast.
 */
export async function showOverlayPreviewOnLive(
  outputId: string
): Promise<boolean> {
  const store = useBroadcastStore.getState()
  const output = store.outputs.find(
    (candidate) => candidate.id === outputId && candidate.content === "overlays"
  )
  if (!output) return false
  store.commitStagedOverlays()
  const runtime = useOutputRuntimeStore.getState().byId[output.id]
  if (!isOutputOn(runtime)) {
    const enabled = await setOutputEnabled(output, true)
    if (!enabled) return false
  }
  useBroadcastStore.getState().setOverlayOutputLive(output.id, true)
  return true
}

/** Takes a Video Overlays output off air. Preview keeps its selection. */
export async function stopOverlayOutputLive(outputId: string): Promise<void> {
  const output = useBroadcastStore
    .getState()
    .outputs.find(
      (candidate) =>
        candidate.id === outputId && candidate.content === "overlays"
    )
  if (!output) return
  await setOutputEnabled(output, false)
}
