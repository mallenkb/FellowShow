import { create } from "zustand"
import { emitTo } from "@tauri-apps/api/event"
import { getAllWindows } from "@tauri-apps/api/window"
import { toast } from "sonner"
import { invoke } from "@/lib/ipc"
import {
  windowLabelForOutput,
  type BroadcastOutputConfig,
} from "@/lib/broadcast-outputs"
import { useBroadcastStore } from "@/stores/broadcast-store"
import type {
  NdiAlphaMode,
  NdiFrameRate,
  NdiResolution,
  NdiStartRequest,
} from "@/types"

/** Per-output transport state: display window + NDI session settings. */
export interface OutputRuntime {
  /** Projector window is visible on a monitor. */
  isDisplayOpen: boolean
  ndiActive: boolean
  ndiSourceName: string
  ndiResolution: NdiResolution
  ndiFrameRate: NdiFrameRate
  ndiAlphaMode: NdiAlphaMode
}

function createOutputRuntime(output: BroadcastOutputConfig): OutputRuntime {
  return {
    isDisplayOpen: false,
    ndiActive: false,
    ndiSourceName: `FellowShow ${output.name}`,
    ndiResolution: "r1080p",
    ndiFrameRate: "fps24",
    ndiAlphaMode: "straightAlpha",
  }
}

export function isOutputOn(runtime: OutputRuntime | undefined): boolean {
  return Boolean(runtime?.isDisplayOpen || runtime?.ndiActive)
}

function ndiFrameRateToNumber(frameRate: NdiFrameRate): number {
  switch (frameRate) {
    case "fps24":
      return 24
    case "fps30":
      return 30
    case "fps60":
      return 60
  }
}

function ndiResolutionDims(resolution: NdiResolution): {
  width: number
  height: number
} {
  switch (resolution) {
    case "r720p":
      return { width: 1280, height: 720 }
    case "r4k":
      return { width: 3840, height: 2160 }
    case "r1080p":
      return { width: 1920, height: 1080 }
  }
}

function emitNdiConfig(
  outputId: string,
  active: boolean,
  runtime: Pick<OutputRuntime, "ndiFrameRate" | "ndiResolution">
): void {
  const dims = ndiResolutionDims(runtime.ndiResolution)
  void emitTo(windowLabelForOutput(outputId), "broadcast:ndi-config", {
    active,
    fps: ndiFrameRateToNumber(runtime.ndiFrameRate),
    width: dims.width,
    height: dims.height,
  }).catch(() => {})
}

/** Re-emit NDI config after a projector window reports ready. */
export function reemitActiveNdiConfigs(
  outputs: BroadcastOutputConfig[],
  runtimeById: Record<string, OutputRuntime>
): void {
  for (const output of outputs) {
    const runtime = runtimeById[output.id]
    if (runtime) emitNdiConfig(output.id, runtime.ndiActive, runtime)
  }
}

/** Whether this output's projector window is currently visible on screen. */
async function isProjectorWindowVisible(outputId: string): Promise<boolean> {
  const label = windowLabelForOutput(outputId)
  const windows = await getAllWindows().catch((error: unknown) => {
    console.warn(`Failed to inspect display window ${label}`, error)
    return []
  })
  const window = windows.find((w) => w.label === label)
  if (!window) return false
  try {
    return await window.isVisible()
  } catch {
    return true
  }
}

interface OutputRuntimeState {
  byId: Record<string, OutputRuntime>
  ensureRuntime: (output: BroadcastOutputConfig) => void
  ensureAll: (outputs: BroadcastOutputConfig[]) => void
  updateRuntime: (id: string, updates: Partial<OutputRuntime>) => void
  removeRuntime: (id: string) => void
  reconcileOutput: (output: BroadcastOutputConfig) => Promise<void>
  reconcileAll: (outputs: BroadcastOutputConfig[]) => Promise<void>
}

export const useOutputRuntimeStore = create<OutputRuntimeState>((set, get) => ({
  byId: {},
  ensureRuntime: (output) => {
    set((state) => {
      if (state.byId[output.id]) return state
      return {
        byId: { ...state.byId, [output.id]: createOutputRuntime(output) },
      }
    })
  },
  ensureAll: (outputs) => {
    set((state) => {
      let changed = false
      const next = { ...state.byId }
      for (const output of outputs) {
        if (!next[output.id]) {
          next[output.id] = createOutputRuntime(output)
          changed = true
        }
      }
      // Drop runtimes for removed outputs.
      for (const id of Object.keys(next)) {
        if (!outputs.some((output) => output.id === id)) {
          delete next[id]
          changed = true
        }
      }
      return changed ? { byId: next } : state
    })
  },
  updateRuntime: (id, updates) => {
    set((state) => {
      const existing = state.byId[id]
      if (!existing) return state
      return { byId: { ...state.byId, [id]: { ...existing, ...updates } } }
    })
  },
  removeRuntime: (id) => {
    set((state) => {
      if (!state.byId[id]) return state
      const next = { ...state.byId }
      delete next[id]
      return { byId: next }
    })
  },
  reconcileOutput: async (output) => {
    get().ensureRuntime(output)
    const [visible, ndiStatus] = await Promise.all([
      isProjectorWindowVisible(output.id),
      invoke("get_ndi_status", { outputId: output.id }).catch(() => null),
    ])
    get().updateRuntime(output.id, {
      isDisplayOpen: visible,
      ndiActive: Boolean(ndiStatus?.active),
    })
  },
  reconcileAll: async (outputs) => {
    get().ensureAll(outputs)
    await Promise.all(outputs.map((output) => get().reconcileOutput(output)))
  },
}))

function runtimeFor(outputId: string): OutputRuntime | undefined {
  return useOutputRuntimeStore.getState().byId[outputId]
}

export async function openDisplayOutput(
  output: BroadcastOutputConfig
): Promise<void> {
  const store = useOutputRuntimeStore.getState()
  store.ensureRuntime(output)
  const runtime = runtimeFor(output.id) ?? createOutputRuntime(output)
  try {
    await invoke("open_broadcast_window", {
      outputId: output.id,
      monitorIndex: output.monitorIndex ?? 0,
    })
    store.updateRuntime(output.id, { isDisplayOpen: true })
    useBroadcastStore.getState().syncBroadcastOutputFor(output.id)
    emitNdiConfig(output.id, runtime.ndiActive, runtime)
    setTimeout(() => {
      useBroadcastStore.getState().syncBroadcastOutputFor(output.id)
    }, 150)
  } catch (error) {
    console.error(`Failed to open display for ${output.name}`, error)
    store.updateRuntime(output.id, { isDisplayOpen: false })
    toast.error(`Couldn't open ${output.name}`, {
      description:
        typeof error === "string"
          ? error
          : "That screen may have been disconnected. Refresh screens in Manage and try again.",
    })
    throw error
  }
}

async function startNdiOutput(output: BroadcastOutputConfig): Promise<void> {
  const store = useOutputRuntimeStore.getState()
  store.ensureRuntime(output)
  const runtime = runtimeFor(output.id) ?? createOutputRuntime(output)
  try {
    await invoke("ensure_broadcast_window", { outputId: output.id })
    const request: NdiStartRequest = {
      sourceName: runtime.ndiSourceName,
      resolution: runtime.ndiResolution,
      frameRate: runtime.ndiFrameRate,
      alphaMode: runtime.ndiAlphaMode,
    }
    const session = await invoke("start_ndi", {
      outputId: output.id,
      request,
    })
    store.updateRuntime(output.id, { ndiActive: true })
    useBroadcastStore.getState().syncBroadcastOutputFor(output.id)
    void emitTo(windowLabelForOutput(output.id), "broadcast:ndi-config", {
      active: true,
      fps: session.fps,
      width: session.width,
      height: session.height,
    }).catch(() => {})
    setTimeout(() => {
      useBroadcastStore.getState().syncBroadcastOutputFor(output.id)
      emitNdiConfig(output.id, true, runtime)
    }, 300)
    toast.success(`NDI source "${runtime.ndiSourceName}" is broadcasting`)
  } catch (error) {
    console.error(`Failed to start NDI for ${output.name}`, error)
    toast.error(`Couldn't start NDI for ${output.name}`, {
      description: typeof error === "string" ? error : undefined,
    })
    throw error
  }
}

export async function stopOutput(output: BroadcastOutputConfig): Promise<void> {
  const store = useOutputRuntimeStore.getState()
  const runtime = runtimeFor(output.id)
  if (runtime?.ndiActive) {
    await invoke("stop_ndi", { outputId: output.id }).catch(() => {})
    if (runtime) emitNdiConfig(output.id, false, runtime)
  }
  await invoke("close_broadcast_window", { outputId: output.id }).catch(
    () => {}
  )
  store.updateRuntime(output.id, { ndiActive: false, isDisplayOpen: false })
}

/**
 * Turn an output on or off using its configured type (display vs NDI).
 * Returns false when the action was blocked (e.g. no monitors).
 */
export async function setOutputEnabled(
  output: BroadcastOutputConfig,
  enabled: boolean,
  options?: { monitorCount?: number }
): Promise<boolean> {
  if (!enabled) {
    await stopOutput(output)
    return true
  }
  if (output.outputType === "display") {
    if (options?.monitorCount === 0) {
      toast.error("No display detected", {
        description:
          "Connect an external display and open Manage to refresh, or switch this output to NDI.",
      })
      return false
    }
    if (output.monitorIndex === null) {
      toast.error("Pick a screen first", {
        description: `Choose a screen for ${output.name} in Manage, then turn it on.`,
      })
      openBroadcastSettingsDeferred(output.id)
      return false
    }
    await openDisplayOutput(output)
    return true
  }
  await startNdiOutput(output)
  return true
}

function openBroadcastSettingsDeferred(focusOutputId: string) {
  // Dynamic import keeps this module free of a hard cycle with the dialog UI.
  void import("@/lib/broadcast-settings-dialog")
    .then((mod) => {
      mod.openBroadcastSettings(focusOutputId)
    })
    .catch(() => {})
}
