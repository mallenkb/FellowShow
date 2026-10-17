// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, render, screen, waitFor } from "@testing-library/react"
import { RemoteControlSection } from "./remote-control-section"
import { useRemoteControl } from "@/hooks/use-remote-control"
import { useRemoteControlStore } from "@/stores/remote-control-store"

const { handlers, invoke } = vi.hoisted(() => ({
  handlers: new Map<string, (event: { payload: unknown }) => void>(),
  invoke: vi.fn<(command: string) => Promise<unknown>>(),
}))

vi.mock("@/lib/ipc", () => ({ invoke }))
vi.mock("@tauri-apps/api/core", () => ({
  isTauri: () => true,
  convertFileSrc: (path: string) => path,
}))
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(
    async (name: string, handler: (event: { payload: unknown }) => void) => {
      handlers.set(name, handler)
      return () => {
        handlers.delete(name)
      }
    }
  ),
  emitTo: vi.fn(() => Promise.resolve()),
}))

function Operator({ settingsVisible = true }: { settingsVisible?: boolean }) {
  useRemoteControl()
  return settingsVisible ? <RemoteControlSection /> : null
}

beforeEach(() => {
  useRemoteControlStore.setState(useRemoteControlStore.getInitialState(), true)
  invoke.mockImplementation(async (command) => ({
    running: true,
    port: command === "get_osc_status" ? 18701 : 18702,
  }))
})

afterEach(() => {
  cleanup()
  handlers.clear()
  vi.clearAllMocks()
})

describe("RemoteControlSection", () => {
  it("shows the transport reported by the native command listener", async () => {
    render(<Operator />)
    await waitFor(() => expect(handlers.has("remote:received")).toBe(true))
    act(() => {
      handlers.get("remote:received")?.({
        payload: { source: "HTTP", command: "show" },
      })
      handlers.get("remote:received")?.({
        payload: { source: "OSC", command: "confidence" },
      })
    })
    expect(screen.getByText("HTTP").parentElement?.textContent).toContain(
      "show"
    )
    expect(screen.getByText("OSC").parentElement?.textContent).toContain(
      "confidence"
    )
  })

  it("retains live ports and command history while settings close and reopen", async () => {
    const view = render(<Operator />)
    await waitFor(() => expect(handlers.has("remote:received")).toBe(true))
    await waitFor(() =>
      expect(screen.getAllByText("Listening")).toHaveLength(2)
    )
    view.rerender(<Operator settingsVisible={false} />)
    act(() => {
      handlers.get("remote:received")?.({
        payload: { source: "HTTP", command: "confidence" },
      })
    })
    view.rerender(<Operator />)
    expect(screen.getAllByText("Listening")).toHaveLength(2)
    expect(screen.getByDisplayValue("18701")).toBeTruthy()
    expect(screen.getByDisplayValue("18702")).toBeTruthy()
    expect(screen.getAllByRole("button", { name: "Stop" })).toHaveLength(2)
    expect(screen.getByText("HTTP").parentElement?.textContent).toContain(
      "confidence"
    )
    expect(
      invoke.mock.calls.every(
        ([command]) => command !== "start_osc" && command !== "start_http"
      )
    ).toBe(true)
  })

  it("checks native listener state before enabling Start on the first visit", () => {
    invoke.mockImplementation(() => new Promise(() => undefined))
    render(<RemoteControlSection />)
    expect(screen.getAllByText("Checking...")).toHaveLength(2)
    for (const button of screen.getAllByRole("button", { name: "Start" })) {
      expect((button as HTMLButtonElement).disabled).toBe(true)
    }
    expect(screen.queryByText("Stopped")).toBeNull()
  })
})
