import { create } from "zustand"
import { emitTo } from "@tauri-apps/api/event"
import { getAllWindows } from "@tauri-apps/api/window"
import { toast } from "sonner"
import { invoke } from "@/lib/ipc"
import { openBroadcastSettings } from "@/lib/broadcast-settings-dialog"
import {
  carriesGraphics,
  outputWindowTitle,
  windowLabelForOutput,
  type BroadcastOutputConfig,
} from "@/lib/broadcast-outputs"
import { useBroadcastStore } from "@/stores/broadcast-store"
import {
  defaultNdiOutputConfig,
  sameNdiOutputConfig,
  sanitizeNdiOutputConfig,
} from "@/lib/ndi-output-config"
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
  const config = output.ndi ?? defaultNdiOutputConfig(output.name)
  return {
    isDisplayOpen: false,
    ndiActive: false,
    ...ndiRuntimeSettings(config),
  }
}

function ndiRuntimeSettings(config: NdiStartRequest) {
  return {
    ndiSourceName: config.sourceName,
    ndiResolution: config.resolution,
    ndiFrameRate: config.frameRate,
    ndiAlphaMode: config.alphaMode,
  }
}

function restoreRuntimeConfig(
  output: BroadcastOutputConfig,
  existing: OutputRuntime | undefined
): OutputRuntime {
  if (!existing) return createOutputRuntime(output)
  if (!output.ndi) return existing
  const settings = ndiRuntimeSettings(output.ndi)
  return Object.entries(settings).every(
    ([key, value]) => existing[key as keyof OutputRuntime] === value
  )
    ? existing
    : { ...existing, ...settings }
}

function persistRuntimeConfig(id: string, updates: Partial<OutputRuntime>) {
  if (
    updates.ndiSourceName === undefined &&
    updates.ndiResolution === undefined &&
    updates.ndiFrameRate === undefined &&
    updates.ndiAlphaMode === undefined
  )
    return
  const store = useBroadcastStore.getState()
  const output = store.outputs.find((candidate) => candidate.id === id)
  if (!output) return
  const previous = output.ndi ?? defaultNdiOutputConfig(output.name)
  const next = sanitizeNdiOutputConfig(
    {
      sourceName: updates.ndiSourceName ?? previous.sourceName,
      resolution: updates.ndiResolution ?? previous.resolution,
      frameRate: updates.ndiFrameRate ?? previous.frameRate,
      alphaMode: updates.ndiAlphaMode ?? previous.alphaMode,
    },
    previous
  )
  if (next && !sameNdiOutputConfig(previous, next))
    store.updateOutput(id, { ndi: next })
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

function reconcileLiveOverlayOutputs() {
  const store = useBroadcastStore.getState()
  const runtimeById = useOutputRuntimeStore.getState().byId
  const liveIds = store.liveOverlayOutputIds.filter((id) =>
    store.outputs.some(
      (output) =>
        output.id === id &&
        carriesGraphics(output, store.outputs) &&
        isOutputOn(runtimeById[id])
    )
  )
  if (liveIds.length === store.liveOverlayOutputIds.length) return
  useBroadcastStore.setState({ liveOverlayOutputIds: liveIds })
  for (const id of store.liveOverlayOutputIds) {
    if (!liveIds.includes(id)) store.syncBroadcastOutputFor(id)
  }
}

export const useOutputRuntimeStore = create<OutputRuntimeState>((set, get) => ({
  byId: {},
  ensureRuntime: (output) => {
    set((state) => {
      const runtime = restoreRuntimeConfig(output, state.byId[output.id])
      if (runtime === state.byId[output.id]) return state
      return {
        byId: { ...state.byId, [output.id]: runtime },
      }
    })
    reconcileLiveOverlayOutputs()
  },
  ensureAll: (outputs) => {
    set((state) => {
      let changed = false
      const next = { ...state.byId }
      for (const output of outputs) {
        const runtime = restoreRuntimeConfig(output, next[output.id])
        if (next[output.id] !== runtime) {
          next[output.id] = runtime
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
    reconcileLiveOverlayOutputs()
  },
  updateRuntime: (id, updates) => {
    if (!get().byId[id]) {
      reconcileLiveOverlayOutputs()
      return
    }
    set((state) => {
      const existing = state.byId[id]
      if (!existing) return state
      return { byId: { ...state.byId, [id]: { ...existing, ...updates } } }
    })
    reconcileLiveOverlayOutputs()
    persistRuntimeConfig(id, updates)
  },
  removeRuntime: (id) => {
    set((state) => {
      if (!state.byId[id]) return state
      const next = { ...state.byId }
      delete next[id]
      return { byId: next }
    })
    reconcileLiveOverlayOutputs()
  },
  reconcileOutput: async (output) => {
    get().ensureRuntime(output)
    const requestedRuntime = get().byId[output.id]
    const [visible, ndiStatus] = await Promise.all([
      isProjectorWindowVisible(output.id),
      invoke("get_ndi_status", { outputId: output.id }).catch(() => null),
    ])
    // A poll begun before Start/Stop or removal must not overwrite that action.
    if (get().byId[output.id] !== requestedRuntime) return
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
      title: outputWindowTitle(output),
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
    await invoke("ensure_broadcast_window", {
      outputId: output.id,
      title: outputWindowTitle(output),
    })
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
    store.updateRuntime(output.id, { ndiActive: false })
    console.error(`Failed to start NDI for ${output.name}`, error)
    toast.error(`Couldn't start NDI for ${output.name}`, {
      description: typeof error === "string" ? error : undefined,
      // Operators without a working NDI receiver can send this output to a
      // screen instead, without hunting for the setting in Manage.
      action: {
        label: "Use a display instead",
        onClick: () => switchOutputToDisplay(output.id),
      },
    })
    throw error
  }
}

/** Turns an NDI output into a normal screen output. */
function switchOutputToDisplay(outputId: string): void {
  const store = useBroadcastStore.getState()
  const output = store.outputs.find((candidate) => candidate.id === outputId)
  if (!output) return
  useOutputRuntimeStore.getState().updateRuntime(outputId, { ndiActive: false })
  store.updateOutput(outputId, { outputType: "display" })
  toast.success(`${output.name} is now a display`, {
    description: "Choose its screen in Displays, then Manage, and turn it on.",
  })
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
  if (output.content === "overlays") {
    useBroadcastStore.getState().setOverlayOutputLive(output.id, false)
  }
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
  reconcileLiveOverlayOutputs()
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
      openBroadcastSettings(output.id)
      return false
    }
    await openDisplayOutput(output)
    return true
  }
  await startNdiOutput(output)
  return true
}
