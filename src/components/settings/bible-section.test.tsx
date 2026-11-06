// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"

const { mockInvoke, mockListen } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
  mockListen: vi.fn(),
}))

vi.mock("@/lib/ipc", () => ({ invoke: mockInvoke }))
vi.mock("@tauri-apps/api/event", () => ({ listen: mockListen }))
vi.mock("@tauri-apps/plugin-store", () => ({ load: vi.fn() }))

import { useBibleStore } from "@/stores/bible-store"
import { useSettingsStore } from "@/stores/settings-store"
import { useTranslationDownloadStore } from "@/stores/translation-download-store"
import { BibleSection } from "./bible-section"

const translation = {
  id: 2,
  abbreviation: "NIV",
  title: "New International Version",
  language: "en",
  is_downloaded: false,
  is_copyrighted: true,
}

beforeEach(() => {
  vi.clearAllMocks()
  mockListen.mockResolvedValue(vi.fn())
  useBibleStore.setState({ translations: [] })
  useSettingsStore.setState({
    hiddenTranslationIds: [],
    pinnedTranslationIds: [],
  })
})

afterEach(cleanup)

it("keeps a download cancelable after leaving and returning to the settings section", async () => {
  let rejectTransfer: (reason: string) => void = () => {}
  mockInvoke.mockImplementation((command: string) => {
    if (command === "list_translations") return Promise.resolve([translation])
    if (command === "get_active_translation") return Promise.resolve(0)
    if (command === "prepare_translation_download") return Promise.resolve(3)
    if (command === "download_translation") {
      return new Promise((_resolve, reject) => {
        rejectTransfer = reject
      })
    }
    if (command === "cancel_translation_download") {
      rejectTransfer("Translation download cancelled")
      return Promise.resolve(true)
    }
    throw new Error(`Unexpected command: ${command}`)
  })

  const first = render(<BibleSection />)
  fireEvent.click(await screen.findByRole("button", { name: "Download NIV" }))
  await waitFor(() =>
    expect(mockInvoke).toHaveBeenCalledWith("download_translation", {
      abbreviation: "NIV",
      downloadId: 3,
    })
  )
  first.unmount()

  render(<BibleSection />)
  const cancel = await screen.findByRole("button", {
    name: "Cancel NIV download",
  })
  expect(cancel.textContent).toContain("Cancel")
  fireEvent.click(cancel)
  await waitFor(() =>
    expect(mockInvoke).toHaveBeenCalledWith("cancel_translation_download", {
      downloadId: 3,
    })
  )
  await waitFor(() =>
    expect(useTranslationDownloadStore.getState().abbreviation).toBeNull()
  )
  expect(useBibleStore.getState().translations).toEqual([translation])
})
