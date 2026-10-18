import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { BroadcastOutputConfig } from "./broadcast-outputs"

const storage = vi.hoisted(() => ({ values: new Map<string, unknown>() }))
const invoke = vi.hoisted(() =>
  vi
    .fn<(command: string, args?: unknown) => Promise<unknown>>()
    .mockResolvedValue(null)
)
vi.mock("@/lib/ipc", () => ({ invoke }))
vi.mock("@tauri-apps/api/event", () => ({ emitTo: vi.fn(async () => {}) }))
vi.mock("@tauri-apps/api/window", () => ({
  getAllWindows: vi.fn(async () => []),
}))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock("@tauri-apps/plugin-store", () => ({
  load: vi.fn(async () => ({
    get: async (key: string) => storage.values.get(key),
    set: async (key: string, value: unknown) => {
      storage.values.set(key, structuredClone(value))
    },
    save: async () => {},
  })),
}))

beforeEach(() => {
  vi.useFakeTimers()
  vi.resetModules()
  invoke.mockReset().mockResolvedValue(null)
  storage.values.clear()
})

afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
})

async function loadSession() {
  const { useBroadcastStore } = await import("@/stores/broadcast-store")
  const { useOutputRuntimeStore } = await import("./broadcast-output-runtime")
  // The app can mount its output controls before async storage hydration.
  useOutputRuntimeStore
    .getState()
    .ensureAll(useBroadcastStore.getState().outputs)
  const { hydrateBroadcastThemes } =
    await import("@/stores/broadcast-store-persistence")
  await hydrateBroadcastThemes()
  useOutputRuntimeStore
    .getState()
    .ensureAll(useBroadcastStore.getState().outputs)
  return { useBroadcastStore, useOutputRuntimeStore }
}

describe("saved NDI output configuration", () => {
  it("restores each output's chosen sender settings after a fresh session without activating outputs", async () => {
    const first = await loadSession()
    const runtime = first.useOutputRuntimeStore.getState()
    runtime.updateRuntime("main", {
      ndiSourceName: "Loopback Verify",
      ndiResolution: "r720p",
      ndiFrameRate: "fps30",
      ndiAlphaMode: "premultipliedAlpha",
    })
    runtime.updateRuntime("alt", {
      ndiSourceName: "Scripture Source",
      ndiResolution: "r4k",
      ndiFrameRate: "fps60",
      ndiAlphaMode: "noneOpaque",
    })
    runtime.updateRuntime("main", { ndiActive: true, isDisplayOpen: true })
    await vi.advanceTimersByTimeAsync(500)

    expect(storage.values.get("schemaVersion")).toBe(2)
    const saved = storage.values.get("outputs") as BroadcastOutputConfig[]
    expect(saved[0].ndi).toEqual({
      sourceName: "Loopback Verify",
      resolution: "r720p",
      frameRate: "fps30",
      alphaMode: "premultipliedAlpha",
    })
    expect(JSON.stringify(saved)).not.toMatch(/ndiActive|isDisplayOpen/)

    vi.resetModules()
    invoke.mockClear()
    const second = await loadSession()
    expect(second.useOutputRuntimeStore.getState().byId.main).toEqual({
      isDisplayOpen: false,
      ndiActive: false,
      ndiSourceName: "Loopback Verify",
      ndiResolution: "r720p",
      ndiFrameRate: "fps30",
      ndiAlphaMode: "premultipliedAlpha",
    })
    expect(second.useOutputRuntimeStore.getState().byId.alt).toMatchObject({
      ndiActive: false,
      isDisplayOpen: false,
      ndiSourceName: "Scripture Source",
      ndiResolution: "r4k",
      ndiFrameRate: "fps60",
      ndiAlphaMode: "noneOpaque",
    })
    expect(invoke).not.toHaveBeenCalled()
  })

  it("loads version-one output profiles and sanitizes malformed NDI values and saved session flags", async () => {
    storage.values.set("schemaVersion", 1)
    storage.values.set("outputs", [
      {
        id: "main",
        name: "Pro\0gram",
        content: "everything",
        outputType: "ndi",
        ndi: {
          sourceName: "bad\0source",
          resolution: "r99k",
          frameRate: 90,
          alphaMode: "invalid",
          ndiActive: true,
          isDisplayOpen: true,
        },
      },
    ])
    const { useBroadcastStore, useOutputRuntimeStore } = await loadSession()
    expect(useBroadcastStore.getState().outputs[0].ndi).toEqual({
      sourceName: "FellowShow Program",
      resolution: "r1080p",
      frameRate: "fps24",
      alphaMode: "straightAlpha",
    })
    expect(useOutputRuntimeStore.getState().byId.main).toMatchObject({
      ndiSourceName: "FellowShow Program",
      ndiResolution: "r1080p",
      ndiFrameRate: "fps24",
      ndiAlphaMode: "straightAlpha",
      ndiActive: false,
      isDisplayOpen: false,
    })
  })

  it("keeps transient name edits usable while retaining the last valid saved name", async () => {
    const { useBroadcastStore, useOutputRuntimeStore } = await loadSession()
    const runtime = useOutputRuntimeStore.getState()
    runtime.updateRuntime("main", { ndiSourceName: "Room A" })
    runtime.updateRuntime("main", { ndiSourceName: "" })
    expect(useOutputRuntimeStore.getState().byId.main.ndiSourceName).toBe("")
    expect(useBroadcastStore.getState().outputs[0].ndi?.sourceName).toBe(
      "Room A"
    )
    runtime.updateRuntime("main", { ndiSourceName: "Room A East " })
    expect(useBroadcastStore.getState().outputs[0].ndi?.sourceName).toBe(
      "Room A East "
    )
  })

  it("preserves live session flags when restoring changed durable settings within a session", async () => {
    const { useBroadcastStore, useOutputRuntimeStore } = await loadSession()
    const runtime = useOutputRuntimeStore.getState()
    runtime.updateRuntime("main", { ndiActive: true, isDisplayOpen: true })
    useBroadcastStore.getState().updateOutput("main", {
      ndi: {
        sourceName: "Saved Source",
        resolution: "r720p",
        frameRate: "fps30",
        alphaMode: "noneOpaque",
      },
    })
    runtime.ensureAll(useBroadcastStore.getState().outputs)
    expect(useOutputRuntimeStore.getState().byId.main).toMatchObject({
      ndiActive: true,
      isDisplayOpen: true,
      ndiSourceName: "Saved Source",
      ndiResolution: "r720p",
    })
  })

  it("starts the native sender with restored choices after hydration", async () => {
    const ndi = {
      sourceName: "Loopback Verify",
      resolution: "r720p",
      frameRate: "fps30",
      alphaMode: "noneOpaque",
    }
    storage.values.set("schemaVersion", 2)
    storage.values.set("outputs", [
      {
        id: "main",
        name: "Program",
        content: "everything",
        outputType: "ndi",
        ndi,
      },
    ])
    const { useBroadcastStore } = await loadSession()
    invoke.mockImplementation(async (command) =>
      command === "start_ndi"
        ? {
            ...ndi,
            width: 1280,
            height: 720,
            fps: 30,
          }
        : null
    )
    const { setOutputEnabled } = await import("./broadcast-output-runtime")

    await expect(
      setOutputEnabled(useBroadcastStore.getState().outputs[0], true)
    ).resolves.toBe(true)

    expect(invoke).toHaveBeenCalledWith("start_ndi", {
      outputId: "main",
      request: ndi,
    })
  })

  it("offers to switch a failing NDI output to a normal display", async () => {
    const { toast } = await import("sonner")
    const { useBroadcastStore } = await loadSession()
    useBroadcastStore.getState().updateOutput("main", { outputType: "ndi" })
    invoke.mockImplementation(async (command: string) => {
      if (command === "start_ndi") {
        throw new Error("failed to create NDI sender instance")
      }
      return null
    })
    const { setOutputEnabled } = await import("./broadcast-output-runtime")

    await setOutputEnabled(useBroadcastStore.getState().outputs[0], true).catch(
      () => false
    )

    const options = vi.mocked(toast.error).mock.calls.at(-1)?.[1] as
      { action?: { label: string; onClick: () => void } } | undefined
    expect(options?.action?.label).toBe("Use a display instead")
    options?.action?.onClick()
    expect(useBroadcastStore.getState().outputs[0].outputType).toBe("display")
  })
})

async function liveGraphicsOutput() {
  const session = await loadSession()
  const { useBroadcastStore, useOutputRuntimeStore } = session
  const output = useBroadcastStore.getState().addOutput({
    content: "overlays",
    outputType: "ndi",
  })
  if (!output) throw new Error("Could not configure graphics output")
  const runtime = useOutputRuntimeStore.getState()
  runtime.ensureRuntime(output)
  runtime.updateRuntime(output.id, { ndiActive: true })
  useBroadcastStore.getState().setOverlayOutputLive(output.id, true)
  return { ...session, output }
}

describe("graphics output live-state reconciliation", () => {
  it("clears a live flag when the native output disappears while keeping Preview staged", async () => {
    const { output, useBroadcastStore, useOutputRuntimeStore } =
      await liveGraphicsOutput()
    const store = useBroadcastStore.getState()
    const tickerId = store.saveTickerMessage({ text: "Sermon notes" })
    store.toggleStagedTicker(tickerId)
    store.commitStagedOverlays()
    invoke.mockImplementation(async (command) =>
      command === "get_ndi_status" ? { active: false } : null
    )

    await useOutputRuntimeStore.getState().reconcileOutput(output)

    const state = useBroadcastStore.getState()
    expect(state.liveOverlayOutputIds).toEqual([])
    expect(state.stagedOverlays.tickerMessageId).toBe(tickerId)
    expect(state.activeOverlays.tickerMessageId).toBe(tickerId)
    expect(state.isLive).toBe(false)
  })

  it("keeps graphics live while either display or NDI is still running, independent of Program", async () => {
    const { output, useBroadcastStore, useOutputRuntimeStore } =
      await liveGraphicsOutput()
    const runtime = useOutputRuntimeStore.getState()
    runtime.updateRuntime(output.id, { isDisplayOpen: true })
    runtime.updateRuntime(output.id, { ndiActive: false })
    expect(useBroadcastStore.getState().liveOverlayOutputIds).toEqual([
      output.id,
    ])
    expect(useBroadcastStore.getState().isLive).toBe(false)
    runtime.updateRuntime(output.id, { isDisplayOpen: false })
    expect(useBroadcastStore.getState().liveOverlayOutputIds).toEqual([])
  })

  it("clears missing runtimes and can explicitly clear the flag for a removed output", async () => {
    const { output, useBroadcastStore, useOutputRuntimeStore } =
      await liveGraphicsOutput()
    useOutputRuntimeStore.getState().removeRuntime(output.id)
    expect(useBroadcastStore.getState().liveOverlayOutputIds).toEqual([])
    useBroadcastStore.setState({ liveOverlayOutputIds: ["removed-output"] })
    useBroadcastStore.getState().setOverlayOutputLive("removed-output", false)
    expect(useBroadcastStore.getState().liveOverlayOutputIds).toEqual([])
  })

  it("removes flags for outputs missing from configuration during ensureAll", async () => {
    const { output, useBroadcastStore, useOutputRuntimeStore } =
      await liveGraphicsOutput()
    useBroadcastStore.setState({
      outputs: useBroadcastStore
        .getState()
        .outputs.filter((candidate) => candidate.id !== output.id),
    })
    useOutputRuntimeStore
      .getState()
      .ensureAll(useBroadcastStore.getState().outputs)
    expect(useBroadcastStore.getState().liveOverlayOutputIds).toEqual([])
    expect(useOutputRuntimeStore.getState().byId[output.id]).toBeUndefined()
  })

  it("clears stale live state on NDI startup failure", async () => {
    const { output, useBroadcastStore, useOutputRuntimeStore } =
      await liveGraphicsOutput()
    invoke.mockImplementation(async (command) => {
      if (command === "start_ndi") throw new Error("sender unavailable")
      return null
    })
    const { setOutputEnabled } = await import("./broadcast-output-runtime")

    await expect(setOutputEnabled(output, true)).rejects.toThrow(
      "sender unavailable"
    )

    expect(useOutputRuntimeStore.getState().byId[output.id].ndiActive).toBe(
      false
    )
    expect(useBroadcastStore.getState().liveOverlayOutputIds).toEqual([])
  })

  it("does not let an older native poll turn off an output that just started", async () => {
    const { output, useBroadcastStore, useOutputRuntimeStore } =
      await liveGraphicsOutput()
    let resolveStatus: ((value: { active: boolean }) => void) | undefined
    const status = new Promise<{ active: boolean }>((resolve) => {
      resolveStatus = resolve
    })
    invoke.mockImplementation(async (command) =>
      command === "get_ndi_status" ? status : null
    )
    const runtime = useOutputRuntimeStore.getState()
    const reconcile = runtime.reconcileOutput(output)
    runtime.updateRuntime(output.id, { ndiActive: true })
    resolveStatus?.({ active: false })
    await reconcile

    expect(useOutputRuntimeStore.getState().byId[output.id].ndiActive).toBe(
      true
    )
    expect(useBroadcastStore.getState().liveOverlayOutputIds).toEqual([
      output.id,
    ])
  })

  it("restarts a missing transport instead of returning early for a stale live flag", async () => {
    const { output, useBroadcastStore, useOutputRuntimeStore } =
      await liveGraphicsOutput()
    useOutputRuntimeStore.setState((state) => ({
      byId: {
        ...state.byId,
        [output.id]: { ...state.byId[output.id], ndiActive: false },
      },
    }))
    invoke.mockImplementation(async (command) =>
      command === "start_ndi" ? { fps: 24, width: 1920, height: 1080 } : null
    )
    const { showOverlayPreviewOnLive } = await import("./overlay-live")

    await expect(showOverlayPreviewOnLive(output.id)).resolves.toBe(true)

    expect(invoke).toHaveBeenCalledWith(
      "start_ndi",
      expect.objectContaining({ outputId: output.id })
    )
    expect(useOutputRuntimeStore.getState().byId[output.id].ndiActive).toBe(
      true
    )
    expect(useBroadcastStore.getState().liveOverlayOutputIds).toEqual([
      output.id,
    ])
    expect(useBroadcastStore.getState().isLive).toBe(false)
  })

  it("takes Program content off air when graphics go live, so only one shows", async () => {
    const { output, useBroadcastStore } = await liveGraphicsOutput()
    invoke.mockImplementation(async (command) =>
      command === "start_ndi" ? { fps: 24, width: 1920, height: 1080 } : null
    )
    const { showOverlayPreviewOnLive } = await import("./overlay-live")
    const store = useBroadcastStore.getState()
    const tickerId = store.saveTickerMessage({ text: "Welcome" })
    store.toggleStagedTicker(tickerId)
    useBroadcastStore.setState({
      isLive: true,
      liveVerse: {
        reference: "John 3:16",
        segments: [{ text: "For God so loved the world" }],
        themeSection: "bible",
      },
    })

    await expect(showOverlayPreviewOnLive(output.id)).resolves.toBe(true)

    expect(useBroadcastStore.getState().isLive).toBe(false)
    expect(useBroadcastStore.getState().activeOverlays.tickerMessageId).toBe(
      tickerId
    )
  })

  it("leaves Program alone when there are no graphics to send", async () => {
    const { output, useBroadcastStore } = await liveGraphicsOutput()
    invoke.mockImplementation(async (command) =>
      command === "start_ndi" ? { fps: 24, width: 1920, height: 1080 } : null
    )
    const { showOverlayPreviewOnLive } = await import("./overlay-live")
    useBroadcastStore.setState({
      isLive: true,
      liveVerse: {
        reference: "John 3:16",
        segments: [{ text: "For God so loved the world" }],
        themeSection: "bible",
      },
    })

    await showOverlayPreviewOnLive(output.id)

    expect(useBroadcastStore.getState().isLive).toBe(true)
  })
})
