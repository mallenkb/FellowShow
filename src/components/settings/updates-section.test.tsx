// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { prepareAvailableUpdate } from "@/lib/app-updater"
import { UpdatesSection } from "./updates-section"

vi.mock("@tauri-apps/api/app", () => ({
  getVersion: vi.fn().mockResolvedValue("1.0.0"),
}))
vi.mock("@/lib/app-updater", () => ({
  prepareAvailableUpdate: vi.fn(),
}))

afterEach(() => {
  cleanup()
  vi.mocked(prepareAvailableUpdate).mockReset()
})

it("shows a failed check and retries before reporting no updates", async () => {
  vi.mocked(prepareAvailableUpdate)
    .mockResolvedValueOnce({ kind: "error", message: "Connection timed out" })
    .mockResolvedValueOnce({ kind: "none" })
  render(<UpdatesSection />)

  fireEvent.click(screen.getByRole("button", { name: "Check & update" }))
  const alert = await screen.findByRole("alert")
  expect(alert.textContent).toContain("Connection timed out")
  expect(screen.queryByText("No updates found.")).toBeNull()

  fireEvent.click(screen.getByRole("button", { name: "Retry" }))
  expect(await screen.findByText("No updates found.")).toBeTruthy()
  expect(screen.queryByRole("alert")).toBeNull()
  expect(prepareAvailableUpdate).toHaveBeenCalledTimes(2)
})

it("reports when another check is running", async () => {
  vi.mocked(prepareAvailableUpdate).mockResolvedValueOnce({ kind: "busy" })
  render(<UpdatesSection />)

  fireEvent.click(screen.getByRole("button", { name: "Check & update" }))
  expect(await screen.findByText("A check is already running.")).toBeTruthy()
  expect(screen.queryByText("No updates found.")).toBeNull()
})
