// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { OutputCard } from "./output-card"
import { useBroadcastStore } from "@/stores/broadcast-store"
import { useOutputRuntimeStore } from "@/lib/broadcast-output-runtime"
import type { BroadcastOutputConfig } from "@/lib/broadcast-outputs"

const invoke = vi.hoisted(() =>
  vi.fn<(command: string, args?: unknown) => Promise<unknown>>()
)
vi.mock("@/lib/ipc", () => ({ invoke }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock("@tauri-apps/api/event", () => ({ emitTo: vi.fn(async () => {}) }))
vi.mock("@tauri-apps/api/window", () => ({
  getAllWindows: vi.fn(async () => []),
}))
vi.mock("@/stores", async () => {
  const { useBroadcastStore } = await import("@/stores/broadcast-store")
  return { useBroadcastStore }
})

beforeEach(() => {
  invoke.mockReset().mockResolvedValue(null)
  useBroadcastStore.setState(useBroadcastStore.getInitialState(), true)
  useOutputRuntimeStore.setState(useOutputRuntimeStore.getInitialState(), true)
  useOutputRuntimeStore.setState({
    reconcileOutput: vi.fn(async () => {}),
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

describe("OutputCard NDI settings", () => {
  it("locks the sender format while broadcasting and permits changes after Stop", () => {
    const output: BroadcastOutputConfig = {
      ...useBroadcastStore.getState().outputs[0],
      outputType: "ndi",
    }
    const runtime = useOutputRuntimeStore.getState()
    runtime.ensureRuntime(output)
    runtime.updateRuntime(output.id, { ndiActive: true })
    render(
      <OutputCard
        output={output}
        monitors={[]}
        refreshing={false}
        onRefresh={() => {}}
        takenMonitors={[]}
        canRemove={false}
      />
    )

    const controls = [
      screen.getByPlaceholderText(`FellowShow ${output.name}`),
      screen.getByRole("combobox", { name: "NDI resolution" }),
      screen.getByRole("combobox", { name: "NDI frame rate" }),
      screen.getByRole("combobox", { name: "NDI alpha channel" }),
      screen.getByRole("button", { name: "Display" }),
      screen.getByRole("button", { name: "NDI" }),
    ]
    for (const control of controls) {
      expect(control.hasAttribute("disabled")).toBe(true)
    }

    act(() => {
      useOutputRuntimeStore
        .getState()
        .updateRuntime(output.id, { ndiActive: false })
    })
    for (const control of controls) {
      expect(control.hasAttribute("disabled")).toBe(false)
    }
  })

  it("locks the transport choice while a physical display is open", () => {
    const output: BroadcastOutputConfig = {
      ...useBroadcastStore.getState().outputs[0],
      outputType: "display",
    }
    const runtime = useOutputRuntimeStore.getState()
    runtime.ensureRuntime(output)
    runtime.updateRuntime(output.id, { isDisplayOpen: true })
    render(
      <OutputCard
        output={output}
        monitors={[]}
        refreshing={false}
        onRefresh={() => {}}
        takenMonitors={[]}
        canRemove={false}
      />
    )
    const controls = [
      screen.getByRole("button", { name: "Display" }),
      screen.getByRole("button", { name: "NDI" }),
    ]
    for (const control of controls) {
      expect(control.hasAttribute("disabled")).toBe(true)
    }
    act(() => {
      useOutputRuntimeStore
        .getState()
        .updateRuntime(output.id, { isDisplayOpen: false })
    })
    for (const control of controls) {
      expect(control.hasAttribute("disabled")).toBe(false)
    }
  })

  it("locks sender choices during native startup and restores editing after failure", async () => {
    const user = userEvent.setup()
    const error = new Error("Synthetic startup failure")
    let finishOpening: (() => void) | undefined
    const opening = new Promise<null>((resolve) => {
      finishOpening = () => resolve(null)
    })
    invoke.mockImplementation((command) => {
      if (command === "ensure_broadcast_window") return opening
      if (command === "start_ndi") return Promise.reject(error)
      return Promise.resolve(null)
    })
    const errors = vi.spyOn(console, "error").mockImplementation(() => {})
    const output: BroadcastOutputConfig = {
      ...useBroadcastStore.getState().outputs[0],
      outputType: "ndi",
    }
    render(
      <OutputCard
        output={output}
        monitors={[]}
        refreshing={false}
        onRefresh={() => {}}
        takenMonitors={[]}
        canRemove={false}
      />
    )
    const controls = [
      screen.getByPlaceholderText(`FellowShow ${output.name}`),
      screen.getByRole("combobox", { name: "NDI resolution" }),
      screen.getByRole("combobox", { name: "NDI frame rate" }),
      screen.getByRole("combobox", { name: "NDI alpha channel" }),
      screen.getByRole("button", { name: "Display" }),
      screen.getByRole("button", { name: "NDI" }),
    ]
    await user.click(screen.getByRole("switch"))
    expect(invoke).toHaveBeenCalledWith("ensure_broadcast_window", {
      outputId: output.id,
      title: expect.any(String),
    })
    expect(useOutputRuntimeStore.getState().byId[output.id].ndiActive).toBe(
      false
    )
    for (const control of controls) {
      expect(control.hasAttribute("disabled")).toBe(true)
    }

    await act(async () => {
      finishOpening?.()
      await opening
    })
    await waitFor(() => {
      for (const control of controls) {
        expect(control.hasAttribute("disabled")).toBe(false)
      }
    })
    expect(errors).toHaveBeenCalledWith(
      `Failed to start NDI for ${output.name}`,
      error
    )
  })
})
