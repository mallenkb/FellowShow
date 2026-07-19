import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url"
import { cachePresentationMediaAsset } from "@/lib/presentation-media"
import type { PresentationPage } from "@/stores/presentation-store"

export const PRESENTATION_DOCUMENT_EXTENSIONS = [
  "pdf",
  "ppt",
  "pptx",
  "pps",
  "ppsx",
  "pot",
  "potx",
  "odp",
  "doc",
  "docx",
  "docm",
  "dot",
  "dotx",
  "odt",
  "rtf",
  "xls",
  "xlsx",
  "xlsm",
  "ods",
] as const

export function presentationDocumentName(name: string) {
  const fileName = name.split(/[/\\]/).pop() ?? name
  return fileName.replace(/\.[^.]+$/, "") || "Document"
}

function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error("Could not create an image for a document page."))
    }, "image/png")
  })
}

export async function renderPdfPresentationPages(
  pdfData: ArrayBuffer,
  documentId: string,
  documentName: string,
  onPageRendered?: (page: PresentationPage, pageCount: number) => void
): Promise<PresentationPage[]> {
  const pdfjs = await import("pdfjs-dist")
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(pdfData) })
  const document = await loadingTask.promise
  const baseName = presentationDocumentName(documentName)
  const pages: PresentationPage[] = []

  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const pdfPage = await document.getPage(pageNumber)
      const naturalViewport = pdfPage.getViewport({ scale: 1 })
      const longestEdge = Math.max(
        naturalViewport.width,
        naturalViewport.height
      )
      const scale = Math.min(3, 1920 / longestEdge)
      const viewport = pdfPage.getViewport({ scale })
      const canvas = window.document.createElement("canvas")

      try {
        canvas.width = Math.max(1, Math.ceil(viewport.width))
        canvas.height = Math.max(1, Math.ceil(viewport.height))
        await pdfPage.render({
          canvas,
          viewport,
          background: "rgb(255,255,255)",
        }).promise

        const png = await canvasToPng(canvas)
        const cached = await cachePresentationMediaAsset(
          png,
          `${baseName}-page-${pageNumber}.png`
        )
        const page: PresentationPage = {
          id: crypto.randomUUID(),
          documentId,
          pageNumber,
          name: `${baseName} – Page ${pageNumber}`,
          url: cached.url,
          cachedPath: cached.filePath,
          width: canvas.width,
          height: canvas.height,
          fit: "contain",
          scale: 1,
          offsetX: 0,
          offsetY: 0,
        }
        pages.push(page)
        onPageRendered?.(page, document.numPages)
      } finally {
        pdfPage.cleanup()
        canvas.width = 0
        canvas.height = 0
      }
    }
  } finally {
    await loadingTask.destroy()
  }

  return pages
}
