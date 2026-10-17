// @vitest-environment jsdom

import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { act, cleanup, renderHook } from "@testing-library/react"
import { useAudioStore } from "@/stores/audio-store"
import { useTranscriptStore } from "@/stores/transcript-store"
import { useTranscription } from "./use-transcription"

const stopped = vi.hoisted(() => ({ handler: null as (() => void) | null }))

vi.mock("@/hooks/use-tauri-event", () => ({
  useTauriEvent: (event: string, handler: () => void) => {
    if (event === "stt_stopped") stopped.handler = handler
  },
}))

beforeEach(() => {
  stopped.handler = null
  useTranscriptStore.setState({
    isTranscribing: true,
    currentPartial: "last partial",
    connectionStatus: "connected",
  })
  useAudioStore.getState().setLevel({ rms: 0.2, peak: 0.8 })
})

afterEach(cleanup)

it("resets the microphone meter when the native session finishes", () => {
  renderHook(() => useTranscription())
  expect(stopped.handler).toBeTypeOf("function")
  act(() => {
    stopped.handler?.()
  })
  expect(useAudioStore.getState().level).toEqual({ rms: 0, peak: 0 })
  expect(useTranscriptStore.getState().isTranscribing).toBe(false)
  expect(useTranscriptStore.getState().currentPartial).toBe("")
  expect(useTranscriptStore.getState().connectionStatus).toBe("disconnected")
})
