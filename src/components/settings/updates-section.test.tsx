// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import type { DownloadEvent } from "@tauri-apps/plugin-updater"
import { prepareAvailableUpdate, useAppUpdateStatus } from "@/lib/app-updater"
import { UpdatesSection } from "./updates-section"

const { check } = vi.hoisted(() => ({ check: vi.fn() }))
vi.mock("@tauri-apps/api/app", () => ({
  getVersion: vi.fn().mockResolvedValue("1.0.0"),
}))
vi.mock("@tauri-apps/api/core", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tauri-apps/api/core")>()),
  isTauri: () => true,
}))
vi.mock("@tauri-apps/plugin-updater", () => ({ check }))

afterEach(() => {
  cleanup()
  check.mockReset()
  useAppUpdateStatus.setState({ status: { kind: "idle" } })
  vi.restoreAllMocks()
})

it("shows a failed check and retries before reporting no updates", async () => {
  check.mockRejectedValueOnce(new Error("Connection timed out"))
  check.mockResolvedValueOnce(null)
  render(<UpdatesSection />)

  fireEvent.click(screen.getByRole("button", { name: "Check & update" }))
  const alert = await screen.findByRole("alert")
  expect(alert.textContent).toContain("Connection timed out")
  expect(screen.queryByText("No updates found.")).toBeNull()

  fireEvent.click(screen.getByRole("button", { name: "Retry" }))
  expect(await screen.findByText("No updates found.")).toBeTruthy()
  expect(screen.queryByRole("alert")).toBeNull()
  expect(check).toHaveBeenCalledTimes(2)
})

it("shows the active background download when the updates page opens", async () => {
  vi.spyOn(window.navigator, "platform", "get").mockReturnValue("MacIntel")
  let sendEvent: ((event: DownloadEvent) => void) | undefined
  let finishDownload: (() => void) | undefined
  check.mockResolvedValueOnce({
    version: "2.0.0",
    downloadAndInstall: (onEvent: (event: DownloadEvent) => void) => {
      sendEvent = onEvent
      return new Promise<void>((resolve) => {
        finishDownload = resolve
      })
    },
  })

  const backgroundUpdate = prepareAvailableUpdate()
  await Promise.resolve()
  try {
    sendEvent?.({ event: "Started", data: { contentLength: 200 } })
    sendEvent?.({ event: "Progress", data: { chunkLength: 50 } })
    render(<UpdatesSection />)

    const progress = screen.getByRole("progressbar", {
      name: "Update download progress",
    })
    expect(progress.getAttribute("value")).toBe("25")
    expect(
      screen.getByText("Downloading FellowShow 2.0.0 in the background.")
    ).toBeTruthy()
    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: "Check & update" })
        .disabled
    ).toBe(true)
    act(() => sendEvent?.({ event: "Progress", data: { chunkLength: 100 } }))
    expect(progress.getAttribute("value")).toBe("75")

    act(() => sendEvent?.({ event: "Finished" }))
    expect(screen.getByText("Preparing FellowShow 2.0.0…")).toBeTruthy()
  } finally {
    await act(async () => {
      finishDownload?.()
      await backgroundUpdate
    })
  }
  expect(screen.getByRole("button", { name: "Restart…" })).toBeTruthy()
  expect(check).toHaveBeenCalledOnce()
})
