import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@tauri-apps/api/event", () => ({
  emitTo: vi.fn().mockResolvedValue(undefined),
  listen: vi.fn(() => Promise.resolve(() => undefined)),
}))
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(() => Promise.resolve(null)),
  isTauri: () => false,
}))

describe("General as the single output", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("lets General carry graphics only when there is no Video Overlays output", async () => {
    const { createOutputConfig, graphicsOutputs } =
      await import("@/lib/broadcast-outputs")
    const general = createOutputConfig([], { content: "everything" })
    const graphics = {
      ...createOutputConfig([general], { content: "overlays" }),
      id: "graphics",
    }
    expect(graphicsOutputs([general]).map((output) => output.id)).toEqual([
      general.id,
    ])
    expect(
      graphicsOutputs([general, graphics]).map((output) => output.id)
    ).toEqual(["graphics"])
  })

  it("switches General to the keyable background whenever Program is clear", async () => {
    const { createOutputConfig } = await import("@/lib/broadcast-outputs")
    const { getOutputKeyMode } = await import("./broadcast-store-helpers")
    const general = {
      ...createOutputConfig([], { content: "everything" }),
      overlayMode: "dsk-luma" as const,
    }
    const state = { outputs: [general] }
    expect(getOutputKeyMode(state, general, null, null)).toBe("dsk-luma")
    expect(
      getOutputKeyMode(
        state,
        general,
        { reference: "John 3:16", segments: [{ text: "x" }] },
        null
      )
    ).toBeNull()
    // With a separate Video Overlays output, General follows its key choice.
    const graphics = {
      ...createOutputConfig([general], { content: "overlays" }),
      overlayMode: "chroma-key" as const,
    }
    expect(
      getOutputKeyMode({ outputs: [general, graphics] }, general, null, null)
    ).toBe("chroma-key")
  })

  it("keeps General on when graphics are stopped", async () => {
    const { useBroadcastStore } = await import("./broadcast-store")
    const { stopOverlayOutputLive } = await import("@/lib/overlay-live")
    const { createOutputConfig } = await import("@/lib/broadcast-outputs")
    const general = {
      ...createOutputConfig([], { content: "everything" }),
      id: "general",
    }
    useBroadcastStore.setState({
      outputs: [general],
      liveOverlayOutputIds: ["general"],
    })
    await stopOverlayOutputLive("general")
    expect(useBroadcastStore.getState().liveOverlayOutputIds).toEqual([])
    expect(useBroadcastStore.getState().outputs).toHaveLength(1)
  })
})
