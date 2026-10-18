import {
  isOutputOn,
  setOutputEnabled,
  useOutputRuntimeStore,
} from "@/lib/broadcast-output-runtime"
import {
  carriesGraphics,
  graphicsOutputs,
  type BroadcastOutputConfig,
} from "@/lib/broadcast-outputs"
import { programHidesGraphics } from "@/lib/overlays"
import { useBroadcastStore } from "@/stores"

/** The Video Overlays output the operator picked, else the first one. */
export function resolveOverlayOutput(
  outputs: readonly BroadcastOutputConfig[],
  selectedOutputId: string | null
): BroadcastOutputConfig | null {
  const carriers = graphicsOutputs(outputs)
  return (
    carriers.find((output) => output.id === selectedOutputId) ??
    carriers[0] ??
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
    (candidate) =>
      candidate.id === outputId && carriesGraphics(candidate, store.outputs)
  )
  if (!output) return false
  store.commitStagedOverlays()
  const runtime = useOutputRuntimeStore.getState().byId[output.id]
  if (!isOutputOn(runtime)) {
    const enabled = await setOutputEnabled(output, true)
    if (!enabled) return false
  }
  useBroadcastStore.getState().setOverlayOutputLive(output.id, true)
  // One thing on screen at a time: graphics only show over live video, so
  // sending them takes scripture, songs, notes or media off Program.
  const state = useBroadcastStore.getState()
  const active = state.activeOverlays
  const sendsGraphics =
    active.logoVisible ||
    Boolean(active.barId || active.tickerMessageId || active.lowerThird)
  if (
    sendsGraphics &&
    state.isLive &&
    programHidesGraphics(state.liveVerse, state.presenterTimer)
  ) {
    state.setLive(false)
  }
  return true
}

/**
 * Takes graphics off air. Preview keeps its selection. A Video Overlays output
 * closes; a General display stays on and just drops the graphics.
 */
export async function stopOverlayOutputLive(outputId: string): Promise<void> {
  const store = useBroadcastStore.getState()
  const output = store.outputs.find(
    (candidate) =>
      candidate.id === outputId && carriesGraphics(candidate, store.outputs)
  )
  if (!output) return
  if (output.content === "everything") {
    store.setOverlayOutputLive(output.id, false)
    return
  }
  await setOutputEnabled(output, false)
}
