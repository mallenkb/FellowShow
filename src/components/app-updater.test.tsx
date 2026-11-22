// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { StrictMode } from "react"
import { afterEach, expect, it, vi } from "vitest"
import { relaunch } from "@tauri-apps/plugin-process"
import { invoke } from "@/lib/ipc"
import {
  prepareAvailableUpdate,
  shouldRunAutomaticUpdateCheck,
  UPDATE_CHECK_INTERVAL_MS,
  UPDATE_READY_EVENT,
} from "@/lib/app-updater"
import { useSermonDialogStore } from "@/lib/sermon-dialog"
import { useSermonStore } from "@/stores/sermon-store"
import { useRecordingStore } from "@/stores/recording-store"
import { SermonSessionDialog } from "@/components/controls/sermon-session-dialog"
import AppUpdater from "./app-updater"

vi.mock("@tauri-apps/plugin-process", () => ({ relaunch: vi.fn() }))
vi.mock("@/lib/ipc", () => ({ invoke: vi.fn() }))
vi.mock("@/lib/app-updater", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/app-updater")>()),
  IS_TAURI_RUNTIME: true,
  shouldRunAutomaticUpdateCheck: vi.fn(async () => false),
  prepareAvailableUpdate: vi.fn(async () => ({ kind: "none" })),
}))
afterEach(() => {
  cleanup()
  vi.mocked(shouldRunAutomaticUpdateCheck).mockReset().mockResolvedValue(false)
  vi.mocked(prepareAvailableUpdate).mockClear()
  vi.useRealTimers()
  window.localStorage.clear()
})

it("checks every launch even after a recent check and checks daily in StrictMode", async () => {
  vi.useFakeTimers()
  vi.mocked(shouldRunAutomaticUpdateCheck).mockResolvedValue(true)
  window.localStorage.setItem(
    "fellowshow:last-update-check-at",
    String(Date.now())
  )

  const launch = () =>
    render(
      <StrictMode>
        <AppUpdater />
      </StrictMode>
    )
  const firstLaunch = launch()
  await act(async () => {})
  expect(prepareAvailableUpdate).toHaveBeenCalledTimes(1)

  firstLaunch.unmount()
  launch()
  await act(async () => {})
  expect(prepareAvailableUpdate).toHaveBeenCalledTimes(2)

  await act(() => vi.advanceTimersByTimeAsync(UPDATE_CHECK_INTERVAL_MS))
  expect(prepareAvailableUpdate).toHaveBeenCalledTimes(3)
})

it("waits for the automatic update preference and skips the check when disabled", async () => {
  let finishHydration!: (enabled: boolean) => void
  vi.mocked(shouldRunAutomaticUpdateCheck).mockReturnValueOnce(
    new Promise<boolean>((resolve) => {
      finishHydration = resolve
    })
  )
  render(<AppUpdater />)
  expect(prepareAvailableUpdate).not.toHaveBeenCalled()

  await act(async () => finishHydration(false))
  expect(prepareAvailableUpdate).not.toHaveBeenCalled()
})

it.each(["sermon", "recording"])(
  "asks before restarting during a %s",
  async (kind) => {
    useSermonStore.setState({
      activeSessionId: kind === "sermon" ? "s1" : null,
    })
    useRecordingStore.setState({
      status: kind === "recording" ? "stopping" : "idle",
      sermonId: "s1",
    })
    useSermonDialogStore.getState().dismiss()
    render(
      <>
        <AppUpdater />
        <SermonSessionDialog />
      </>
    )
    act(() => {
      window.dispatchEvent(new CustomEvent(UPDATE_READY_EVENT))
    })
    fireEvent.click(screen.getByRole("button", { name: "Restart now" }))
    await waitFor(() =>
      expect(useSermonDialogStore.getState().request).toEqual({
        mode: "restart",
        sessionId: "s1",
      })
    )
    fireEvent.click(await screen.findByRole("button", { name: "Later" }))
    expect(useSermonDialogStore.getState().request).toBeNull()
    expect(useSermonStore.getState().activeSessionId).toBe(
      kind === "sermon" ? "s1" : null
    )
    expect(useRecordingStore.getState().status).toBe(
      kind === "recording" ? "stopping" : "idle"
    )
    expect(relaunch).not.toHaveBeenCalled()
    expect(invoke).not.toHaveBeenCalled()
  }
)
