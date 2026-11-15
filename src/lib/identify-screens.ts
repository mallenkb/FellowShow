import { emitTo } from "@tauri-apps/api/event"
import { toast } from "sonner"
import { invoke, type MonitorInfo } from "@/lib/ipc"
import {
  windowLabelForOutput,
  type BroadcastOutputConfig,
} from "@/lib/broadcast-outputs"
import { screenLabel } from "@/lib/screen-identity"

/** Sent to an open output window so it shows its own Identify label. */
export const IDENTIFY_EVENT = "broadcast:identify"
export const IDENTIFY_DURATION_MS = 5000

export interface IdentifyLabel {
  title: string
  detail: string
}

export interface IdentifyPlan {
  /** Output windows already full screen, which draw the label themselves. */
  outputWindows: Array<{ windowLabel: string; label: IdentifyLabel }>
  /** Screens that get a temporary label window. */
  screens: Array<{ monitorIndex: number } & IdentifyLabel>
}

/**
 * Label every connected screen with its name in FellowShow and the outputs
 * set to it. A screen already showing an output window gets the label inside
 * that window, because a separate window can't appear over a full-screen
 * window on macOS.
 */
export function planIdentify(
  monitors: readonly MonitorInfo[],
  outputs: ReadonlyArray<
    Pick<BroadcastOutputConfig, "id" | "name" | "outputType" | "monitorIndex">
  >,
  isDisplayOpen: (outputId: string) => boolean
): IdentifyPlan {
  const plan: IdentifyPlan = { outputWindows: [], screens: [] }
  for (const monitor of monitors) {
    const owners = outputs.filter(
      (output) =>
        output.outputType === "display" && output.monitorIndex === monitor.index
    )
    const label: IdentifyLabel = {
      title: screenLabel(monitor),
      detail:
        owners.length > 0
          ? owners.map((output) => output.name).join(", ")
          : monitor.isPrimary
            ? "Operator"
            : "Free",
    }
    const open = owners.filter((output) => isDisplayOpen(output.id))
    if (open.length > 0) {
      for (const output of open) {
        plan.outputWindows.push({
          windowLabel: windowLabelForOutput(output.id),
          label,
        })
      }
    } else {
      plan.screens.push({ monitorIndex: monitor.index, ...label })
    }
  }
  return plan
}

export async function identifyScreens(
  outputs: ReadonlyArray<BroadcastOutputConfig>,
  isDisplayOpen: (outputId: string) => boolean
): Promise<void> {
  try {
    const monitors = await invoke("list_monitors")
    const plan = planIdentify(monitors, outputs, isDisplayOpen)
    await Promise.all([
      invoke("identify_screens", { screens: plan.screens }),
      ...plan.outputWindows.map(({ windowLabel, label }) =>
        emitTo(windowLabel, IDENTIFY_EVENT, label)
      ),
    ])
  } catch (error) {
    console.error("Failed to identify screens", error)
    toast.error("Couldn't label the screens", {
      description:
        typeof error === "string" ? error : "Refresh screens and try again.",
    })
  }
}
