import { beforeEach, describe, expect, it, vi } from "vitest"

describe("presenter timer store", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("keeps Inter Variable as the default rendered timer font", async () => {
    const { DEFAULT_TIMER_FONT_FAMILY } = await import("@/lib/font-options")
    const { usePresenterTimerStore } = await import("./presenter-timer-store")

    const state = usePresenterTimerStore.getState()

    expect(state.fontFamily).toBe(DEFAULT_TIMER_FONT_FAMILY)
    state.start()
    expect(usePresenterTimerStore.getState().getRenderData()?.fontFamily).toBe(
      DEFAULT_TIMER_FONT_FAMILY
    )
  })

  it("includes the selected timer font in render data", async () => {
    const { usePresenterTimerStore } = await import("./presenter-timer-store")

    usePresenterTimerStore.getState().setFontFamily("Georgia")
    usePresenterTimerStore.getState().start()

    expect(usePresenterTimerStore.getState().getRenderData()?.fontFamily).toBe(
      "Georgia"
    )
  })

  it("always includes the required rendered timer background", async () => {
    const { PRESENTER_TIMER_BACKGROUND_URL } =
      await import("@/lib/presenter-timer-background")
    const { usePresenterTimerStore } = await import("./presenter-timer-store")

    usePresenterTimerStore.getState().start()

    expect(
      usePresenterTimerStore.getState().getRenderData()?.backgroundUrl
    ).toBe(PRESENTER_TIMER_BACKGROUND_URL)
  })

  it("uses the selected custom timer background in render data", async () => {
    const { usePresenterTimerStore } = await import("./presenter-timer-store")
    const customUrl = "data:image/png;base64,custom"

    usePresenterTimerStore.getState().addBackgroundOption({
      id: "custom",
      name: "Custom",
      url: customUrl,
      mediaType: "image",
    })
    usePresenterTimerStore.getState().start()

    expect(
      usePresenterTimerStore.getState().getRenderData()?.backgroundUrl
    ).toBe(customUrl)
  })

  it("includes video media type for selected video timer backgrounds", async () => {
    const { usePresenterTimerStore } = await import("./presenter-timer-store")
    const customUrl = "data:video/mp4;base64,custom"

    usePresenterTimerStore.getState().addBackgroundOption({
      id: "video-custom",
      name: "Video Custom",
      url: customUrl,
      mediaType: "video",
    })
    usePresenterTimerStore.getState().start()

    expect(
      usePresenterTimerStore.getState().getRenderData()?.backgroundMediaType
    ).toBe("video")
  })
})
