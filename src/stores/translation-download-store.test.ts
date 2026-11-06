import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Translation } from "@/types"

const { mockInvoke, mockListen, unlisten } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
  mockListen: vi.fn(),
  unlisten: vi.fn(),
}))

vi.mock("@/lib/ipc", () => ({ invoke: mockInvoke }))
vi.mock("@tauri-apps/api/event", () => ({ listen: mockListen }))
vi.mock("@tauri-apps/plugin-store", () => ({ load: vi.fn() }))

import { useBibleStore } from "./bible-store"
import { useSettingsStore } from "./settings-store"
import {
  translationDownloadActions,
  useTranslationDownloadStore,
} from "./translation-download-store"

const translation: Translation = {
  id: 2,
  abbreviation: "NIV",
  title: "New International Version",
  language: "en",
  is_downloaded: false,
  is_copyrighted: true,
}
const installed = { ...translation, is_downloaded: true }

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockListen.mockResolvedValue(unlisten)
  useBibleStore.setState({ translations: [translation] })
  useSettingsStore.setState({ hiddenTranslationIds: [] })
  useTranslationDownloadStore.setState({
    abbreviation: null,
    progress: null,
    cancelling: false,
    error: null,
  })
})

describe("translation downloads", () => {
  it("cancels before the progress listener is ready without starting a download", async () => {
    const listener = deferred<() => void>()
    mockListen.mockReturnValue(listener.promise)
    const pending = translationDownloadActions.start(translation)

    await translationDownloadActions.cancel()
    expect(useTranslationDownloadStore.getState().cancelling).toBe(true)
    listener.resolve(unlisten)
    await pending

    expect(mockInvoke).not.toHaveBeenCalled()
    expect(unlisten).toHaveBeenCalledOnce()
    expect(useTranslationDownloadStore.getState().abbreviation).toBeNull()
  })

  it("cancels a download being prepared before the transfer starts", async () => {
    const preparation = deferred<number>()
    mockInvoke.mockImplementation((command: string) => {
      if (command === "prepare_translation_download") return preparation.promise
      if (command === "cancel_translation_download")
        return Promise.resolve(true)
      throw new Error(`Unexpected command: ${command}`)
    })
    const pending = translationDownloadActions.start(translation)
    await vi.waitFor(() =>
      expect(mockInvoke).toHaveBeenCalledWith("prepare_translation_download")
    )

    await translationDownloadActions.cancel()
    preparation.resolve(12)
    await pending

    expect(mockInvoke).toHaveBeenCalledWith("cancel_translation_download", {
      downloadId: 12,
    })
    expect(mockInvoke).not.toHaveBeenCalledWith(
      "download_translation",
      expect.anything()
    )
    expect(useBibleStore.getState().translations).toEqual([translation])
  })

  it("cancels an active transfer and allows a clean retry", async () => {
    const transfer = deferred<Translation>()
    let nextId = 0
    mockInvoke.mockImplementation(
      (command: string, args?: { downloadId: number }) => {
        if (command === "prepare_translation_download")
          return Promise.resolve(++nextId)
        if (command === "download_translation") {
          return args?.downloadId === 1
            ? transfer.promise
            : Promise.resolve(installed)
        }
        if (command === "cancel_translation_download") {
          transfer.reject("Translation download cancelled")
          return Promise.resolve(true)
        }
        if (command === "list_translations") return Promise.resolve([installed])
        throw new Error(`Unexpected command: ${command}`)
      }
    )

    const pending = translationDownloadActions.start(translation)
    await vi.waitFor(() =>
      expect(mockInvoke).toHaveBeenCalledWith("download_translation", {
        abbreviation: "NIV",
        downloadId: 1,
      })
    )
    await translationDownloadActions.cancel()
    await pending
    expect(useBibleStore.getState().translations).toEqual([translation])
    expect(useSettingsStore.getState().hiddenTranslationIds).toEqual([])

    await translationDownloadActions.start(translation)
    expect(useBibleStore.getState().translations).toEqual([installed])
    expect(useSettingsStore.getState().hiddenTranslationIds).toContain(2)
    expect(useTranslationDownloadStore.getState().error).toBeNull()
  })

  it("ignores progress from another transfer", async () => {
    const transfer = deferred<Translation>()
    let onProgress: (event: {
      payload: {
        downloadId: number
        abbreviation: string
        downloaded: number
        total: number
      }
    }) => void = () => {}
    mockListen.mockImplementation(async (_event, callback) => {
      onProgress = callback
      return unlisten
    })
    mockInvoke.mockImplementation((command: string) => {
      if (command === "prepare_translation_download") return Promise.resolve(7)
      if (command === "download_translation") return transfer.promise
      if (command === "list_translations") return Promise.resolve([installed])
      throw new Error(`Unexpected command: ${command}`)
    })
    const pending = translationDownloadActions.start(translation)
    await vi.waitFor(() =>
      expect(mockInvoke).toHaveBeenCalledWith("download_translation", {
        abbreviation: "NIV",
        downloadId: 7,
      })
    )

    onProgress({
      payload: {
        downloadId: 7,
        abbreviation: "NIV",
        downloaded: 25,
        total: 100,
      },
    })
    onProgress({
      payload: {
        downloadId: 6,
        abbreviation: "NIV",
        downloaded: 90,
        total: 100,
      },
    })
    expect(useTranslationDownloadStore.getState().progress).toBe(25)
    transfer.resolve(installed)
    await pending
  })

  it("reports a completed install when cancellation arrives too late", async () => {
    const transfer = deferred<Translation>()
    mockInvoke.mockImplementation((command: string) => {
      if (command === "prepare_translation_download") return Promise.resolve(7)
      if (command === "download_translation") return transfer.promise
      if (command === "cancel_translation_download")
        return Promise.resolve(false)
      if (command === "list_translations") return Promise.resolve([installed])
      throw new Error(`Unexpected command: ${command}`)
    })
    const pending = translationDownloadActions.start(translation)
    await vi.waitFor(() =>
      expect(mockInvoke).toHaveBeenCalledWith("download_translation", {
        abbreviation: "NIV",
        downloadId: 7,
      })
    )

    await translationDownloadActions.cancel()
    transfer.resolve(installed)
    await pending

    expect(useBibleStore.getState().translations).toEqual([installed])
    expect(useTranslationDownloadStore.getState().abbreviation).toBeNull()
  })

  it("shows cancellation errors while keeping the transfer available", async () => {
    const transfer = deferred<Translation>()
    mockInvoke.mockImplementation((command: string) => {
      if (command === "prepare_translation_download") return Promise.resolve(8)
      if (command === "download_translation") return transfer.promise
      if (command === "cancel_translation_download")
        return Promise.reject(new Error("Backend unavailable"))
      if (command === "list_translations") return Promise.resolve([installed])
      throw new Error(`Unexpected command: ${command}`)
    })
    const pending = translationDownloadActions.start(translation)
    await vi.waitFor(() =>
      expect(mockInvoke).toHaveBeenCalledWith("download_translation", {
        abbreviation: "NIV",
        downloadId: 8,
      })
    )

    await translationDownloadActions.cancel()
    expect(useTranslationDownloadStore.getState()).toMatchObject({
      abbreviation: "NIV",
      cancelling: false,
      error: "Could not cancel download: Error: Backend unavailable",
    })
    transfer.resolve(installed)
    await pending
    expect(useBibleStore.getState().translations).toEqual([installed])
  })
})
