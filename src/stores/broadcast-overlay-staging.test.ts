import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@tauri-apps/api/event", () => ({
  emitTo: vi.fn().mockResolvedValue(undefined),
}))

async function loadStore() {
  const { useBroadcastStore } = await import("./broadcast-store")
  const store = useBroadcastStore.getState()
  const tickerId = store.saveTickerMessage({ text: "Youth camp closes Sunday" })
  const lowerThirdId = store.saveLowerThirdPreset({
    name: "Preacher",
    theme: "preacher",
    title: "Pastor Daniel Mensah",
    backgroundColor: "#0a101a",
    textColor: "#ffffff",
    widthPercent: 50,
    xPercent: 14,
    yPercent: 82,
    durationMs: 14_000,
  })
  const barId = store.saveBarOverlay({
    name: "Scripture bar",
    source: "live-verse",
    heading: "",
    text: "",
    showBadge: true,
    backgroundType: "gradient",
    backgroundColor: "#9a4a6e",
    backgroundColorEnd: "#46288a",
    backgroundDimPercent: 35,
    textColor: "#ffffff",
    padding: "padded",
  })
  return { useBroadcastStore, tickerId, lowerThirdId, barId }
}

describe("Video Overlays staging", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.useFakeTimers()
  })

  it("stages pads in Preview without changing the live graphics", async () => {
    const { useBroadcastStore, tickerId } = await loadStore()
    useBroadcastStore.getState().toggleStagedTicker(tickerId)

    const state = useBroadcastStore.getState()
    expect(state.stagedOverlays.tickerMessageId).toBe(tickerId)
    expect(state.activeOverlays.tickerMessageId).toBeNull()
  })

  it("keeps a bar on its own in Preview", async () => {
    const { useBroadcastStore, tickerId, lowerThirdId, barId } =
      await loadStore()
    const store = useBroadcastStore.getState()
    store.toggleStagedTicker(tickerId)
    store.toggleStagedLowerThird(lowerThirdId)
    store.toggleStagedBar(barId)

    let staged = useBroadcastStore.getState().stagedOverlays
    expect(staged.barId).toBe(barId)
    expect(staged.tickerMessageId).toBeNull()
    expect(staged.lowerThird).toBeNull()

    store.toggleStagedTicker(tickerId)
    staged = useBroadcastStore.getState().stagedOverlays
    expect(staged.barId).toBeNull()
    expect(staged.tickerMessageId).toBe(tickerId)
  })

  it("sends Preview to the live graphics and replaces what was there", async () => {
    const { useBroadcastStore, tickerId, barId } = await loadStore()
    const store = useBroadcastStore.getState()
    store.toggleStagedTicker(tickerId)
    store.commitStagedOverlays()
    expect(useBroadcastStore.getState().activeOverlays.tickerMessageId).toBe(
      tickerId
    )

    store.toggleStagedBar(barId)
    store.commitStagedOverlays()
    const active = useBroadcastStore.getState().activeOverlays
    expect(active.barId).toBe(barId)
    expect(active.tickerMessageId).toBeNull()
  })

  it("swaps scrolling text and a full-width lower third in Preview", async () => {
    const { useBroadcastStore, tickerId } = await loadStore()
    const store = useBroadcastStore.getState()
    const bannerId = store.saveLowerThirdPreset({
      name: "Presiding Elder",
      theme: "speaker",
      style: "full-width-banner",
      title: "Samuel Appiah",
      backgroundColor: "#071a3b",
      textColor: "#ffffff",
      widthPercent: 50,
      xPercent: 14,
      yPercent: 82,
      durationMs: 14_000,
    })
    store.toggleStagedTicker(tickerId)
    store.toggleStagedLowerThird(bannerId)
    let staged = useBroadcastStore.getState().stagedOverlays
    expect(staged.lowerThird?.preset.id).toBe(bannerId)
    expect(staged.tickerMessageId).toBeNull()

    store.toggleStagedTicker(tickerId)
    staged = useBroadcastStore.getState().stagedOverlays
    expect(staged.tickerMessageId).toBe(tickerId)
    expect(staged.lowerThird).toBeNull()
  })

  it("applies a saved Look to Preview in one step", async () => {
    const { useBroadcastStore, lowerThirdId } = await loadStore()
    const store = useBroadcastStore.getState()
    const lookId = store.saveOverlayLook({
      name: "Sermon",
      logo: false,
      lowerThirdPresetId: lowerThirdId,
      tickerMessageId: null,
      barId: null,
    })
    store.stageOverlayLook(lookId)
    expect(
      useBroadcastStore.getState().stagedOverlays.lowerThird?.preset.id
    ).toBe(lowerThirdId)
  })

  it("removes a deleted bar from Preview, Live and Looks", async () => {
    const { useBroadcastStore, barId } = await loadStore()
    const store = useBroadcastStore.getState()
    store.saveOverlayLook({
      name: "Reading",
      logo: false,
      lowerThirdPresetId: null,
      tickerMessageId: null,
      barId,
    })
    store.toggleStagedBar(barId)
    store.commitStagedOverlays()
    store.deleteBarOverlay(barId)

    const state = useBroadcastStore.getState()
    expect(state.stagedOverlays.barId).toBeNull()
    expect(state.activeOverlays.barId).toBeNull()
    expect(state.overlayConfig.looks[0].barId).toBeNull()
  })

  it("keeps Preview in step when scrolling text goes live directly", async () => {
    const { useBroadcastStore, tickerId, barId } = await loadStore()
    const store = useBroadcastStore.getState()
    store.toggleStagedBar(barId)
    store.commitStagedOverlays()
    // Sermon tools send scripture straight to scrolling text.
    store.showTickerMessage(tickerId)

    const state = useBroadcastStore.getState()
    expect(state.activeOverlays.barId).toBeNull()
    expect(state.stagedOverlays.barId).toBeNull()
    expect(state.stagedOverlays.tickerMessageId).toBe(tickerId)
  })

  it.each(["ticker", "lowerThird"] as const)(
    "removes a deleted %s from Preview, Live and Looks",
    async (kind) => {
      const { useBroadcastStore, tickerId, lowerThirdId } = await loadStore()
      const store = useBroadcastStore.getState()
      store.saveOverlayLook({
        name: "Speaker",
        logo: false,
        lowerThirdPresetId: lowerThirdId,
        tickerMessageId: tickerId,
        barId: null,
      })
      store.toggleStagedTicker(tickerId)
      store.toggleStagedLowerThird(lowerThirdId)
      store.commitStagedOverlays()
      if (kind === "ticker") store.deleteTickerMessage(tickerId)
      else store.deleteLowerThirdPreset(lowerThirdId)
      const state = useBroadcastStore.getState()
      if (kind === "ticker") {
        expect(state.stagedOverlays.tickerMessageId).toBeNull()
        expect(state.stagedOverlays.tickerStartedAt).toBeNull()
        expect(state.activeOverlays.tickerMessageId).toBeNull()
        expect(state.overlayConfig.looks[0].tickerMessageId).toBeNull()
        expect(state.stagedOverlays.lowerThird?.preset.id).toBe(lowerThirdId)
      } else {
        expect(state.stagedOverlays.lowerThird).toBeNull()
        expect(state.activeOverlays.lowerThird).toBeNull()
        expect(state.overlayConfig.looks[0].lowerThirdPresetId).toBeNull()
        expect(state.stagedOverlays.tickerMessageId).toBe(tickerId)
      }
    }
  )

  it("clears logo selection only when the last logo is deleted", async () => {
    const { useBroadcastStore } = await loadStore()
    const store = useBroadcastStore.getState()
    store.addLogoOverlays(
      ["first", "second"].map((id) => ({
        id,
        name: id,
        imageUrl: `asset://${id}.png`,
        visible: true,
        position: "top-right" as const,
        xPercent: 90,
        yPercent: 10,
        widthPercent: 12,
        targetOutputIds: [],
      }))
    )
    store.saveOverlayLook({
      name: "Branding",
      logo: true,
      lowerThirdPresetId: null,
      tickerMessageId: null,
      barId: null,
    })
    store.setLogoOverlayVisible(true)
    store.removeLogoOverlay("first")
    expect(useBroadcastStore.getState().activeOverlays.logoVisible).toBe(true)
    expect(useBroadcastStore.getState().overlayConfig.looks[0].logo).toBe(true)
    store.removeLogoOverlay("second")
    const state = useBroadcastStore.getState()
    expect(state.stagedOverlays.logoVisible).toBe(false)
    expect(state.activeOverlays.logoVisible).toBe(false)
    expect(state.overlayConfig.looks[0].logo).toBe(false)
  })
})
