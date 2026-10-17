// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest"
import { getDocument } from "pdfjs-dist"
import { renderPdfPresentationPages } from "./presentation-documents"

vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: {},
  getDocument: vi.fn(),
}))
vi.mock("@/lib/presentation-media", () => ({
  cachePresentationMediaAsset: vi.fn(),
}))

beforeEach(() => vi.clearAllMocks())

describe("PDF import cleanup", () => {
  it("destroys the worker when a corrupted PDF fails to load", async () => {
    const destroy = vi.fn(async () => {})
    vi.mocked(getDocument).mockReturnValue({
      promise: Promise.reject(new Error("Invalid PDF structure")),
      destroy,
    } as unknown as ReturnType<typeof getDocument>)

    await expect(
      renderPdfPresentationPages(new ArrayBuffer(0), "document", "broken.pdf")
    ).rejects.toThrow("Invalid PDF structure")
    expect(destroy).toHaveBeenCalledOnce()
  })

  it("destroys the worker after a successfully loaded empty document", async () => {
    const destroy = vi.fn(async () => {})
    vi.mocked(getDocument).mockReturnValue({
      promise: Promise.resolve({ numPages: 0 }),
      destroy,
    } as unknown as ReturnType<typeof getDocument>)

    await expect(
      renderPdfPresentationPages(new ArrayBuffer(0), "document", "empty.pdf")
    ).resolves.toEqual([])
    expect(destroy).toHaveBeenCalledOnce()
  })
})
