// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { useReturnFeedStore } from "@/stores/return-feed-store"
import { ReturnFeedMonitor } from "./return-feed-monitor"

vi.mock("@tauri-apps/plugin-store", () => ({
  load: vi.fn(() => Promise.resolve()),
}))

const getUserMedia =
  vi.fn<(c: MediaStreamConstraints) => Promise<MediaStream>>()

const videoOnlyStream = {
  getTracks: () => [
    { kind: "video", stop: vi.fn(), addEventListener: vi.fn() },
  ],
  getAudioTracks: () => [],
} as unknown as MediaStream

beforeEach(() => {
  getUserMedia.mockReset()
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia,
      enumerateDevices: vi.fn(() => Promise.resolve([])),
      addEventListener: vi.fn(),
    },
  })
  useReturnFeedStore.setState({
    status: "off",
    error: null,
    stream: null,
    videoDeviceId: null,
    audioDeviceId: null,
  })
})

afterEach(() => {
  cleanup()
})

describe("ReturnFeedMonitor", () => {
  it("shows the off state and starts the feed", async () => {
    getUserMedia.mockResolvedValue(videoOnlyStream)
    render(<ReturnFeedMonitor />)

    expect(screen.getByText("GoStream is not connected")).toBeTruthy()
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Connect" }))
      await Promise.resolve()
    })

    expect(getUserMedia).toHaveBeenCalled()
    expect(await screen.findByText("GOSTREAM")).toBeTruthy()
  })

  it("shows the error with a retry button", () => {
    useReturnFeedStore.setState({
      status: "error",
      error: "The video source disconnected.",
    })
    render(<ReturnFeedMonitor />)

    expect(screen.getByText("The video source disconnected.")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy()
  })

  it("binds the live stream to the video element", () => {
    useReturnFeedStore.setState({ status: "live", stream: videoOnlyStream })
    render(<ReturnFeedMonitor />)

    const video = screen.getByLabelText<HTMLVideoElement>(
      "GoStream live output"
    )
    expect(video.srcObject).toBe(videoOnlyStream)
    expect(screen.getByText("GOSTREAM")).toBeTruthy()
  })
})
