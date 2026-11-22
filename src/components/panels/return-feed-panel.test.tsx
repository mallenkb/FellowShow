// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useRecordingStore } from "@/stores/recording-store"
import { useReturnFeedStore } from "@/stores/return-feed-store"
import { useSermonStore } from "@/stores/sermon-store"
import { ReturnFeedPanel } from "./return-feed-panel"

vi.mock("@tauri-apps/plugin-store", () => ({
  load: vi.fn(() => Promise.resolve()),
}))

afterEach(() => {
  cleanup()
  useReturnFeedStore.setState({ status: "off" })
  useRecordingStore.setState(useRecordingStore.getInitialState())
  useSermonStore.setState(useSermonStore.getInitialState())
})

describe("ReturnFeedPanel", () => {
  it("collapses and expands like the other panels", async () => {
    const user = userEvent.setup()
    useReturnFeedStore.setState({ status: "live" })
    render(<ReturnFeedPanel />)
    const header = screen.getByRole("button", { name: /GoStream return/ })

    expect(header.getAttribute("aria-expanded")).toBe("true")
    expect(screen.getByLabelText("GoStream live output")).toBeTruthy()

    await user.click(header)
    expect(header.getAttribute("aria-expanded")).toBe("false")
    expect(screen.queryByLabelText("GoStream live output")).toBeNull()

    await user.click(header)
    expect(screen.getByLabelText("GoStream live output")).toBeTruthy()
  })

  it("shows the recording failure alongside Live and retries the active sermon", async () => {
    const user = userEvent.setup()
    const sermonId = useSermonStore.getState().startSession(0, "active-sermon")
    const [sermon] = useSermonStore.getState().sessions
    const error = "Could not save the sermon video. Check free disk space."
    let finishStart = () => {}
    const pendingStart = new Promise<void>((resolve) => {
      finishStart = resolve
    })
    const start = vi.fn(async () => {
      useRecordingStore.setState({ status: "starting", error: null })
      await pendingStart
      useRecordingStore.setState({ status: "recording" })
    })
    useReturnFeedStore.setState({ status: "live" })
    useRecordingStore.setState({ status: "error", error, start })
    render(<ReturnFeedPanel />)

    await user.click(screen.getByRole("button", { name: /GoStream return/ }))
    expect(screen.queryByLabelText("GoStream live output")).toBeNull()
    expect(screen.getByText("Live")).toBeTruthy()
    expect(screen.getByText("Recording stopped")).toBeTruthy()
    expect(screen.getByTitle(error).textContent).toBe(error)

    await user.click(screen.getByRole("button", { name: "Retry recording" }))
    expect(start).toHaveBeenCalledExactlyOnceWith({
      id: sermonId,
      title: sermon.title,
      startedAt: sermon.startedAt,
    })
    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: "Retry recording" })
        .disabled
    ).toBe(true)

    await act(async () => {
      finishStart()
      await pendingStart
    })
    expect(screen.getByText("Recording")).toBeTruthy()
    expect(screen.queryByText("Recording stopped")).toBeNull()
  })

  it("hides a recording failure when there is no active sermon", () => {
    useReturnFeedStore.setState({ status: "live" })
    useRecordingStore.setState({ status: "error", error: "Disk full" })
    render(<ReturnFeedPanel />)

    expect(screen.getByText("Live")).toBeTruthy()
    expect(screen.queryByText("Recording stopped")).toBeNull()
    expect(screen.queryByRole("button", { name: "Retry recording" })).toBeNull()
  })
})
