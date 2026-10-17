// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { OverlaySamplePreviewDialog } from "./overlay-sample-preview-dialog"
import { createDefaultOverlayConfiguration } from "@/lib/overlays"
import { createDefaultOutputs } from "@/lib/broadcast-outputs"
import { useBroadcastStore } from "@/stores/broadcast-store"
import type {
  BroadcastOverlayPayload,
  LowerThirdAppearanceSettings,
} from "@/types"

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(() => Promise.resolve(null)),
  isTauri: () => false,
}))

vi.mock("@tauri-apps/api/event", () => ({
  emitTo: vi.fn(() => Promise.resolve()),
  listen: vi.fn(() => Promise.resolve(() => undefined)),
}))

vi.mock("@tauri-apps/plugin-store", () => ({
  load: vi.fn(() => Promise.resolve()),
}))

vi.mock("@/components/on-display/overlay-video-canvas", () => ({
  OverlayVideoCanvas: ({
    overlays,
  }: {
    overlays: BroadcastOverlayPayload | null
  }) => (
    <div
      data-testid="sample-overlay-canvas"
      data-lower-title={overlays?.lowerThird?.title ?? ""}
      data-lower-subtitle={overlays?.lowerThird?.subtitle ?? ""}
      data-lower-style={overlays?.lowerThird?.style ?? ""}
      data-lower-background={overlays?.lowerThird?.backgroundColor ?? ""}
      data-lower-text-color={overlays?.lowerThird?.textColor ?? ""}
      data-ticker-text={overlays?.ticker?.text ?? ""}
      data-ticker-label={overlays?.ticker?.labelText ?? ""}
      data-ticker-background={overlays?.ticker?.backgroundColor ?? ""}
      data-ticker-text-color={overlays?.ticker?.textColor ?? ""}
      data-ticker-speed={overlays?.ticker?.speed ?? ""}
    />
  ),
}))

const broadcastVerse = {
  reference: "John 3:16",
  segments: [{ text: "For God so loved the world" }],
}

function createOverlayConfig(appearance?: LowerThirdAppearanceSettings) {
  const config = createDefaultOverlayConfiguration()
  config.ticker = {
    backgroundColor: "#fef3c7",
    textColor: "#1f2937",
    labelBackgroundColor: "#7f1d1d",
    labelTextColor: "#ffffff",
    labelText: "GLOBAL NOTICE",
    showLabel: true,
    speed: "fast",
  }
  config.tickerMessages = [
    {
      id: "on-air-message",
      text: "Live announcement",
      targetOutputIds: ["main"],
      createdAt: 1,
      updatedAt: 1,
    },
  ]
  if (appearance) config.lastLowerThirdAppearance = appearance
  return config
}

function seedBroadcastStore(appearance?: LowerThirdAppearanceSettings) {
  useBroadcastStore.setState({
    overlayConfig: createOverlayConfig(appearance),
    isLive: true,
    liveVerse: broadcastVerse,
    activeOverlays: {
      logoVisible: true,
      tickerMessageId: "on-air-message",
      tickerStartedAt: 500,
      lowerThird: null,
      barId: null,
      barStartedAt: null,
    },
    outputs: [
      ...createDefaultOutputs(),
      {
        id: "program-overlays",
        name: "Program overlays",
        content: "overlays",
        themeId: null,
        outputType: "display",
        monitorIndex: 2,
      },
    ],
  })
}

function captureBroadcastState() {
  const { overlayConfig, isLive, liveVerse, activeOverlays, outputs } =
    useBroadcastStore.getState()
  return structuredClone({
    overlayConfig,
    isLive,
    liveVerse,
    activeOverlays,
    outputs,
  })
}

function readSampleCanvas() {
  return screen.getByTestId("sample-overlay-canvas")
}

function expectCanvasAttributes(attributes: Readonly<Record<string, string>>) {
  const canvas = readSampleCanvas()
  for (const [name, value] of Object.entries(attributes)) {
    expect(canvas.getAttribute(name)).toBe(value)
  }
}

function readFieldValue(label: string) {
  const field = screen.getByLabelText(label)
  if (!(
    field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement
  )) {
    throw new Error(`Expected ${label} to be a text field`)
  }
  return field.value
}

const broadcastStoreObservers: Array<() => void> = []

function watchBroadcastStore() {
  const updates: Array<ReturnType<typeof captureBroadcastState>> = []
  broadcastStoreObservers.push(
    useBroadcastStore.subscribe(() => updates.push(captureBroadcastState()))
  )
  return updates
}

describe("OverlaySamplePreviewDialog", () => {
  beforeEach(() => {
    seedBroadcastStore()
  })

  afterEach(() => {
    cleanup()
    for (const unsubscribe of broadcastStoreObservers.splice(0)) unsubscribe()
    vi.useRealTimers()
  })

  it("does not mount the canvas while closed and clears local graphics on reopen", () => {
    const globalState = captureBroadcastState()
    const broadcastUpdates = watchBroadcastStore()
    const onOpenChange = vi.fn()
    const view = render(
      <OverlaySamplePreviewDialog open={false} onOpenChange={onOpenChange} />
    )

    expect(screen.queryByTestId("sample-overlay-canvas")).toBeNull()

    view.rerender(
      <OverlaySamplePreviewDialog open onOpenChange={onOpenChange} />
    )
    fireEvent.change(screen.getByLabelText("Speaker name"), {
      target: { value: "Local speaker" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Show lower third" }))
    fireEvent.change(screen.getByLabelText("Scrolling text"), {
      target: { value: "Local ticker" },
    })
    fireEvent.click(
      screen.getByRole("button", { name: "Start scrolling text" })
    )
    expectCanvasAttributes({
      "data-lower-title": "Local speaker",
      "data-ticker-text": "Local ticker",
    })

    view.rerender(
      <OverlaySamplePreviewDialog open={false} onOpenChange={onOpenChange} />
    )
    expect(screen.queryByTestId("sample-overlay-canvas")).toBeNull()

    view.rerender(
      <OverlaySamplePreviewDialog open onOpenChange={onOpenChange} />
    )
    expect(readFieldValue("Speaker name")).toBe("Sample Speaker")
    expect(readFieldValue("Scrolling text")).toBe("Welcome to today's service")
    expectCanvasAttributes({ "data-lower-title": "", "data-ticker-text": "" })
    expect(captureBroadcastState()).toEqual(globalState)
    expect(broadcastUpdates).toEqual([])
  })

  it("keeps edits local until shown and hides each graphic independently", () => {
    const globalState = captureBroadcastState()
    const broadcastUpdates = watchBroadcastStore()
    render(<OverlaySamplePreviewDialog open onOpenChange={vi.fn()} />)

    fireEvent.change(screen.getByLabelText("Speaker name"), {
      target: { value: "Rehearsal guest" },
    })
    fireEvent.change(screen.getByLabelText("Scrolling text"), {
      target: { value: "First rehearsal notice" },
    })
    expectCanvasAttributes({ "data-lower-title": "", "data-ticker-text": "" })

    fireEvent.click(screen.getByRole("button", { name: "Show lower third" }))
    expectCanvasAttributes({
      "data-lower-title": "Rehearsal guest",
      "data-ticker-text": "",
    })

    fireEvent.click(
      screen.getByRole("button", { name: "Start scrolling text" })
    )
    expectCanvasAttributes({
      "data-ticker-text": "First rehearsal notice",
      "data-ticker-background": "#fef3c7",
      "data-ticker-text-color": "#1f2937",
      "data-ticker-label": "GLOBAL NOTICE",
      "data-ticker-speed": "fast",
    })

    fireEvent.change(screen.getByLabelText("Speaker name"), {
      target: { value: "Updated speaker draft" },
    })
    fireEvent.change(screen.getByLabelText("Scrolling text"), {
      target: { value: "Updated ticker draft" },
    })
    expectCanvasAttributes({
      "data-lower-title": "Rehearsal guest",
      "data-ticker-text": "First rehearsal notice",
    })

    fireEvent.click(screen.getByRole("button", { name: "Show lower third" }))
    expectCanvasAttributes({
      "data-lower-title": "Updated speaker draft",
      "data-ticker-text": "First rehearsal notice",
    })
    fireEvent.click(
      screen.getByRole("button", { name: "Start scrolling text" })
    )
    expectCanvasAttributes({ "data-ticker-text": "Updated ticker draft" })

    fireEvent.click(screen.getByRole("button", { name: "Hide lower third" }))
    expectCanvasAttributes({
      "data-lower-title": "",
      "data-ticker-text": "Updated ticker draft",
    })
    fireEvent.click(screen.getByRole("button", { name: "Show lower third" }))
    fireEvent.click(screen.getByRole("button", { name: "Stop scrolling text" }))
    expectCanvasAttributes({
      "data-lower-title": "Updated speaker draft",
      "data-ticker-text": "",
    })

    fireEvent.click(
      screen.getByRole("button", { name: "Start scrolling text" })
    )
    fireEvent.click(screen.getByRole("button", { name: "Clear graphics" }))
    expectCanvasAttributes({ "data-lower-title": "", "data-ticker-text": "" })
    expect(captureBroadcastState()).toEqual(globalState)
    expect(broadcastUpdates).toEqual([])
  })

  it("resumes a ticker when a full-width sample banner expires", () => {
    const fullWidthAppearance: LowerThirdAppearanceSettings = {
      backgroundColor: "#071a3b",
      textColor: "#ffffff",
      widthPercent: 100,
      xPercent: 50,
      yPercent: 82,
      style: "full-width-banner",
      maxWidthEnabled: true,
      durationMs: 120_000,
    }
    seedBroadcastStore(fullWidthAppearance)
    vi.useFakeTimers({ now: 10_000 })
    const globalState = captureBroadcastState()
    const broadcastUpdates = watchBroadcastStore()
    render(<OverlaySamplePreviewDialog open onOpenChange={vi.fn()} />)

    fireEvent.change(screen.getByLabelText("Scrolling text"), {
      target: { value: "Ticker returns after the banner" },
    })
    fireEvent.click(
      screen.getByRole("button", { name: "Start scrolling text" })
    )
    fireEvent.click(screen.getByRole("button", { name: "Show lower third" }))

    expectCanvasAttributes({
      "data-lower-style": "full-width-banner",
      "data-ticker-text": "",
    })
    expect(
      screen.getByText(
        "Scrolling text is hidden while a full-width banner is shown."
      )
    ).toBeTruthy()

    act(() => {
      vi.advanceTimersByTime(120_000)
    })

    expectCanvasAttributes({
      "data-lower-title": "",
      "data-ticker-text": "Ticker returns after the banner",
    })
    expect(captureBroadcastState()).toEqual(globalState)
    expect(broadcastUpdates).toEqual([])
  })
})
