import { beforeEach, describe, expect, it, vi } from "vitest"

describe("presenter timer store", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("keeps Geist Variable as the default rendered timer font", async () => {
    const { DEFAULT_TIMER_FONT_FAMILY } = await import("@/lib/font-options")
    const { usePresenterTimerStore } = await import("./presenter-timer-store")

    const state = usePresenterTimerStore.getState()

    expect(state.fontFamily).toBe(DEFAULT_TIMER_FONT_FAMILY)
    state.start()
    expect(usePresenterTimerStore.getState().getRenderData()?.fontFamily).toBe(DEFAULT_TIMER_FONT_FAMILY)
  })

  it("includes the selected timer font in render data", async () => {
    const { usePresenterTimerStore } = await import("./presenter-timer-store")

    usePresenterTimerStore.getState().setFontFamily("Georgia")
    usePresenterTimerStore.getState().start()

    expect(usePresenterTimerStore.getState().getRenderData()?.fontFamily).toBe("Georgia")
  })
})
