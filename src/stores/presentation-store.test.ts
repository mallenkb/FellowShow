import { expect, it, vi } from "vitest"
import {
  flushPresentationStore,
  hydratePresentationDocuments,
  usePresentationStore,
} from "./presentation-store"

const store = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn(), save: vi.fn() }))
vi.mock("@tauri-apps/plugin-store", () => ({ load: async () => store }))

it("flushes the current presentation immediately and retries a failed save", async () => {
  vi.useFakeTimers()
  try {
    await hydratePresentationDocuments()
    usePresentationStore.setState({ tickerText: "Final slide" })
    store.save.mockRejectedValueOnce(new Error("disk full"))
    await expect(flushPresentationStore()).rejects.toThrow("disk full")
    await flushPresentationStore()
    expect(store.set).toHaveBeenCalledWith("tickerText", "Final slide")
    expect(store.save).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(500)
    expect(store.save).toHaveBeenCalledTimes(2)
  } finally {
    vi.useRealTimers()
  }
})

it("waits for a running save before writing a newer edit", async () => {
  vi.useFakeTimers()
  try {
    vi.clearAllMocks()
    await hydratePresentationDocuments()
    let release!: () => void
    store.save.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          release = resolve
        })
    )
    usePresentationStore.setState({ tickerText: "First" })
    await vi.advanceTimersByTimeAsync(500)
    expect(store.save).toHaveBeenCalledOnce()
    usePresentationStore.setState({ tickerText: "Second" })
    const saving = flushPresentationStore()
    expect(store.set).not.toHaveBeenCalledWith("tickerText", "Second")
    release()
    await saving
    expect(store.set).toHaveBeenCalledWith("tickerText", "Second")
    expect(store.save).toHaveBeenCalledTimes(2)
    expect(vi.getTimerCount()).toBe(0)
  } finally {
    vi.useRealTimers()
  }
})
