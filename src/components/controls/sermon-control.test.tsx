// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"

const { endSermon } = vi.hoisted(() => ({ endSermon: vi.fn(async () => {}) }))
vi.mock("@/lib/sermon-actions", () => ({
  startSermon: vi.fn(),
  endSermon,
}))
vi.mock("@/hooks/use-transcription", () => ({
  transcriptionActions: { stop: vi.fn() },
}))
vi.mock("@tauri-apps/plugin-store", () => ({ load: vi.fn() }))
vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }))
vi.mock("@tauri-apps/api/event", () => ({ emitTo: vi.fn() }))

import { useSermonStore, useTranscriptStore } from "@/stores"
import { SermonControl } from "./sermon-control"

afterEach(() => {
  cleanup()
  useSermonStore.setState({ transition: null })
  useTranscriptStore.setState({ transition: null })
})

it("lets the operator cancel a sermon while it is starting", () => {
  useSermonStore.setState({ transition: "starting", activeSessionId: null })
  render(<SermonControl />)

  const cancel = screen.getByRole("button", { name: "Cancel start" })
  expect((cancel as HTMLButtonElement).disabled).toBe(false)
  fireEvent.click(cancel)
  expect(endSermon).toHaveBeenCalledOnce()
})
