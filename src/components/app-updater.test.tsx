// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { relaunch } from "@tauri-apps/plugin-process"
import { invoke } from "@/lib/ipc"
import { UPDATE_READY_EVENT } from "@/lib/app-updater"
import { useSermonDialogStore } from "@/lib/sermon-dialog"
import { useSermonStore } from "@/stores/sermon-store"
import { useRecordingStore } from "@/stores/recording-store"
import { SermonSessionDialog } from "@/components/controls/sermon-session-dialog"
import AppUpdater from "./app-updater"

vi.mock("@tauri-apps/plugin-process", () => ({ relaunch: vi.fn() }))
vi.mock("@/lib/ipc", () => ({ invoke: vi.fn() }))
afterEach(cleanup)

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
