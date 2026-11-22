// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react"
import { toast } from "sonner"
import { expect, it, vi } from "vitest"
import { invoke } from "@/lib/ipc"
import { renderPdfPresentationPages } from "@/lib/presentation-documents"
import { usePresentationStore } from "@/stores/presentation-store"
import { usePresentationDocumentImport } from "./use-presentation-document-import"

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: vi.fn(() => true),
}))
vi.mock("@tauri-apps/plugin-dialog", () => ({ open: vi.fn() }))
vi.mock("@tauri-apps/plugin-fs", () => ({ remove: vi.fn() }))
vi.mock("@tauri-apps/plugin-store", () => ({ load: vi.fn() }))
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock("@/lib/ipc", () => ({ invoke: vi.fn() }))
vi.mock("@/lib/presentation-documents", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/presentation-documents")>()),
  renderPdfPresentationPages: vi.fn(),
}))

it("imports the next document after a converter timeout", async () => {
  const stalled = "/source/stalled.pptx"
  const valid = "/source/valid.pdf"
  const timeout = "Conversion timed out after 120 seconds"
  const pdfData = new ArrayBuffer(1)
  vi.mocked(invoke)
    .mockRejectedValueOnce(timeout)
    .mockResolvedValueOnce(pdfData)
  vi.mocked(renderPdfPresentationPages).mockImplementation(
    async (_pdf, documentId, _path, onPageRendered) => {
      const page = {
        id: "valid-page-1",
        documentId,
        pageNumber: 1,
        name: "Valid page 1",
        url: "/cache/valid.png",
        cachedPath: null,
        width: 960,
        height: 540,
        fit: "contain" as const,
        scale: 1,
        offsetX: 0,
        offsetY: 0,
      }
      onPageRendered?.(page, 1)
      return [page]
    }
  )
  const { result } = renderHook(() => usePresentationDocumentImport())

  await act(async () => {
    result.current.importPresentationDocuments([stalled, valid])
  })

  expect(invoke).toHaveBeenNthCalledWith(1, "prepare_presentation_document", {
    path: stalled,
  })
  expect(invoke).toHaveBeenNthCalledWith(2, "prepare_presentation_document", {
    path: valid,
  })
  expect(usePresentationStore.getState().documents).toMatchObject([
    { sourcePath: stalled, status: "error", error: timeout },
    {
      sourcePath: valid,
      status: "ready",
      totalPages: 1,
      pages: [{ id: "valid-page-1" }],
    },
  ])
  expect(toast.error).toHaveBeenCalledWith(timeout)
  expect(result.current.isImportingDocuments).toBe(false)
})
