// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PreviewPanel } from "./preview-panel"
import { stageVerse } from "@/lib/preview-staging"
import { useBibleStore } from "@/stores/bible-store"
import { useBroadcastStore } from "@/stores/broadcast-store"
import { useOutputRuntimeStore } from "@/lib/broadcast-output-runtime"
import { createDefaultOutputs } from "@/lib/broadcast-outputs"
import {
  createDefaultOverlayConfiguration,
  createInactiveOverlayState,
} from "@/lib/overlays"
import { OverlayLooks } from "@/components/on-display/overlay-looks"
import type { Verse, VerseRenderData } from "@/types"

vi.mock("@tauri-apps/api/event", () => ({
  emitTo: vi.fn(() => Promise.resolve()),
  listen: vi.fn(() => Promise.resolve(() => undefined)),
}))

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(() => Promise.resolve(null)),
  isTauri: () => false,
}))

vi.mock("@/components/ui/canvas-verse", () => ({
  CanvasVerse: () => <div data-testid="canvas-verse" />,
}))

const john316: Verse = {
  id: 1,
  translation_id: 1,
  book_number: 43,
  book_name: "John",
  book_abbreviation: "John",
  chapter: 3,
  verse: 16,
  text: "For God so loved the world",
}

const stagedNotice: VerseRenderData = {
  reference: "Notices",
  themeSection: "announcements",
  segments: [{ text: "Youth camp sign-ups close Friday" }],
}

describe("PreviewPanel", () => {
  beforeEach(() => {
    useBibleStore.setState({
      translations: [
        {
          id: 1,
          abbreviation: "KJV",
          title: "King James Version",
          language: "en",
          is_copyrighted: false,
          is_downloaded: true,
        },
      ],
      activeTranslationId: 1,
      selectedVerse: john316,
    })
    useBroadcastStore.setState({
      outputs: createDefaultOutputs(),
      overlayConfig: createDefaultOverlayConfiguration(),
      activeOverlays: createInactiveOverlayState(),
      stagedOverlays: createInactiveOverlayState(),
      liveOverlayOutputIds: [],
      selectedOverlayOutputId: null,
      isLive: false,
      liveSource: null,
      liveVerse: null,
      presenterTimer: null,
      previewVerse: stagedNotice,
      previewTimer: null,
    })
    useOutputRuntimeStore.setState({ byId: {} })
  })

  afterEach(() => {
    cleanup()
    useBroadcastStore.getState().setLive(false)
  })

  it("keeps what is staged when the operator switches tabs", () => {
    const { rerender } = render(<PreviewPanel mode="book" />)
    rerender(<PreviewPanel mode="songs" />)
    rerender(<PreviewPanel mode="presentation" />)
    rerender(<PreviewPanel mode="book" />)

    expect(useBroadcastStore.getState().previewVerse).toBe(stagedNotice)
  })

  it("sends the item the operator just staged to Program", async () => {
    const user = userEvent.setup()
    render(<PreviewPanel mode="book" />)

    // John 3:16 is already the selected verse; staging it again must still
    // replace the notice that another panel put in Preview.
    stageVerse(john316)
    await user.click(screen.getByRole("button", { name: "Show on Live" }))

    const { isLive, liveVerse } = useBroadcastStore.getState()
    expect(isLive).toBe(true)
    expect(liveVerse?.reference).toBe("John 3:16 (KJV)")
  })

  it("turns Show on Live into Stop Live once the staged item is on air", async () => {
    const user = userEvent.setup()
    render(<PreviewPanel mode="book" />)

    await user.click(screen.getByRole("button", { name: "Show on Live" }))
    expect(screen.queryByRole("button", { name: "Show on Live" })).toBeNull()

    await user.click(screen.getByRole("button", { name: "Stop Live" }))
    expect(useBroadcastStore.getState().isLive).toBe(false)
    expect(screen.getByRole("button", { name: "Show on Live" })).toBeTruthy()
  })

  it("offers Stop next to Show on Live when something else is on air", async () => {
    const user = userEvent.setup()
    render(<PreviewPanel mode="book" />)
    await user.click(screen.getByRole("button", { name: "Show on Live" }))

    act(() => stageVerse(john316))

    expect(screen.getByRole("button", { name: "Show on Live" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Stop" })).toBeTruthy()
  })

  it("shows Show on Live and no live Look for stale graphics flags whose transport is off", () => {
    const store = useBroadcastStore.getState()
    const output = store.addOutput({ content: "overlays", outputType: "ndi" })
    if (!output) throw new Error("Graphics output was not configured")
    useOutputRuntimeStore.getState().ensureRuntime(output)
    const tickerId = store.saveTickerMessage({ text: "Sermon notes" })
    store.toggleStagedTicker(tickerId)
    store.commitStagedOverlays()
    store.saveOverlayLook({
      name: "Sermon",
      logo: false,
      tickerMessageId: tickerId,
      lowerThirdPresetId: null,
      barId: null,
    })
    store.setOverlayOutputLive(output.id, true)

    render(
      <>
        <PreviewPanel mode="on-display" />
        <OverlayLooks onSave={vi.fn()} onEdit={vi.fn()} />
      </>
    )

    expect(screen.getByRole("button", { name: "Show on Live" })).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Update Live" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Stop Live" })).toBeNull()
    expect(screen.queryByText("Live", { exact: true })).toBeNull()
  })

  it("tracks a running graphics output independently of Program and clears controls when it stops", () => {
    const store = useBroadcastStore.getState()
    const output = store.addOutput({ content: "overlays", outputType: "ndi" })
    if (!output) throw new Error("Graphics output was not configured")
    const runtime = useOutputRuntimeStore.getState()
    runtime.ensureRuntime(output)
    runtime.updateRuntime(output.id, { ndiActive: true })
    const tickerId = store.saveTickerMessage({ text: "Sermon notes" })
    store.toggleStagedTicker(tickerId)
    store.commitStagedOverlays()
    store.saveOverlayLook({
      name: "Sermon",
      logo: false,
      tickerMessageId: tickerId,
      lowerThirdPresetId: null,
      barId: null,
    })
    store.setOverlayOutputLive(output.id, true)
    render(
      <>
        <PreviewPanel mode="on-display" />
        <OverlayLooks onSave={vi.fn()} onEdit={vi.fn()} />
      </>
    )
    expect(useBroadcastStore.getState().isLive).toBe(false)
    expect(screen.getByRole("button", { name: "Stop Live" })).toBeTruthy()
    expect(screen.getByText("Live", { exact: true })).toBeTruthy()

    act(() => runtime.updateRuntime(output.id, { ndiActive: false }))

    expect(screen.getByRole("button", { name: "Show on Live" })).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Stop Live" })).toBeNull()
    expect(screen.queryByText("Live", { exact: true })).toBeNull()
    expect(useBroadcastStore.getState().liveOverlayOutputIds).toEqual([])
  })
})
