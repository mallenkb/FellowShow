// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { open } from "@tauri-apps/plugin-dialog"
import { toast } from "sonner"
import {
  cachePresentationMedia,
  cachePresentationMediaPath,
} from "@/lib/presentation-media"
import { usePresentationStore } from "@/stores/presentation-store"
import { usePresentationImport } from "./use-presentation-import"

vi.mock("@tauri-apps/api/core", () => ({ isTauri: vi.fn(() => true) }))
vi.mock("@tauri-apps/plugin-dialog", () => ({ open: vi.fn() }))
vi.mock("@tauri-apps/plugin-fs", () => ({ remove: vi.fn(async () => {}) }))
vi.mock("@tauri-apps/plugin-store", () => ({ load: vi.fn(async () => {}) }))
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))
vi.mock("@/lib/presentation-media", () => ({
  cachePresentationMedia: vi.fn(),
  cachePresentationMediaPath: vi.fn(),
}))
vi.mock("./use-presentation-document-import", () => ({
  usePresentationDocumentImport: () => ({
    importPresentationDocuments: vi.fn(),
    isImportingDocuments: false,
  }),
}))
vi.mock("@/lib/preview-staging", () => ({ stageSlide: vi.fn() }))

beforeEach(() => {
  vi.resetAllMocks()
  usePresentationStore.setState({ slides: [], selectedSlideId: null })
})

describe("presentation import error handling", () => {
  it("keeps the valid native image when another selected image cannot decode", async () => {
    vi.mocked(open).mockResolvedValue([
      "/source/broken.png",
      "/source/valid.png",
    ])
    vi.mocked(cachePresentationMediaPath)
      .mockRejectedValueOnce(new Error("image is damaged"))
      .mockResolvedValueOnce("asset://valid.png")
    const { result } = renderHook(() => usePresentationImport())

    await act(async () => result.current.importContent())

    expect(cachePresentationMediaPath).toHaveBeenNthCalledWith(
      2,
      "/source/valid.png",
      "image"
    )
    expect(usePresentationStore.getState().slides).toMatchObject([
      { name: "valid", url: "asset://valid.png", mediaType: "image" },
    ])
    expect(toast.error).toHaveBeenCalledWith("Could not load broken.png", {
      description: "Error: image is damaged",
    })
  })

  it("keeps the valid dropped video when a second video cannot decode", async () => {
    vi.mocked(cachePresentationMedia)
      .mockRejectedValueOnce(new Error("video is damaged"))
      .mockResolvedValueOnce("asset://valid.mp4")
    const files = [
      new File(["broken"], "broken.mp4", { type: "video/mp4" }),
      new File(["valid"], "valid.mp4", { type: "video/mp4" }),
    ] as unknown as FileList
    const { result } = renderHook(() => usePresentationImport())

    await act(async () => result.current.importFiles(files))

    expect(cachePresentationMedia).toHaveBeenNthCalledWith(
      2,
      files[1],
      "valid.mp4",
      "video"
    )
    expect(usePresentationStore.getState().slides).toMatchObject([
      { name: "valid", url: "asset://valid.mp4", mediaType: "video" },
    ])
    expect(toast.error).toHaveBeenCalledWith(
      "1 media file could not be loaded. Other files were loaded."
    )
  })
})
