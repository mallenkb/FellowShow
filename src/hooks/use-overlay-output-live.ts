import {
  isOutputOn,
  useOutputRuntimeStore,
} from "@/lib/broadcast-output-runtime"
import { useBroadcastStore } from "@/stores/broadcast-store"

/** A graphics bus is on air only while its own display or NDI output is on. */
export function useOverlayOutputLive(outputId?: string | null): boolean {
  const outputs = useBroadcastStore((state) => state.outputs)
  const liveIds = useBroadcastStore((state) => state.liveOverlayOutputIds)
  return useOutputRuntimeStore((state) =>
    outputs.some(
      (output) =>
        output.content === "overlays" &&
        (outputId === undefined || output.id === outputId) &&
        liveIds.includes(output.id) &&
        isOutputOn(state.byId[output.id])
    )
  )
}
