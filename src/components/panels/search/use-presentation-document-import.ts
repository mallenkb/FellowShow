import { useCallback, useState } from "react"
import { isTauri } from "@tauri-apps/api/core"
import { open } from "@tauri-apps/plugin-dialog"
import { toast } from "sonner"
import { invoke } from "@/lib/ipc"
import {
  PRESENTATION_DOCUMENT_EXTENSIONS,
  presentationDocumentName,
  renderPdfPresentationPages,
} from "@/lib/presentation-documents"
import { usePresentationStore } from "@/stores/presentation-store"

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === "string") return error
  return "Could not import the document."
}

async function selectDocumentPaths() {
  const selected = await open({
    multiple: true,
    filters: [
      {
        name: "Presentation documents",
        extensions: [...PRESENTATION_DOCUMENT_EXTENSIONS],
      },
    ],
  })
  if (!selected) return []
  return Array.isArray(selected) ? selected : [selected]
}

export function usePresentationDocumentImport() {
  const [isImportingDocuments, setIsImportingDocuments] = useState(false)

  const importPresentationDocuments = useCallback(
    (providedPaths?: string[]) => {
      if (!isTauri()) {
        toast.error("Document imports are available in the desktop app.")
        return
      }

      void (async () => {
        const paths = providedPaths ?? (await selectDocumentPaths())
        if (paths.length === 0) return

        setIsImportingDocuments(true)
        try {
          let importedDocuments = 0
          let importedPages = 0
          let failedDocuments = 0
          let firstError = ""

          for (const path of paths) {
            const documentId = crypto.randomUUID()
            usePresentationStore.getState().startDocumentImport({
              id: documentId,
              name: presentationDocumentName(path),
              sourcePath: path,
              createdAt: Date.now(),
              status: "importing",
              totalPages: 0,
              pages: [],
              error: null,
            })
            try {
              const pdfData = await invoke("prepare_presentation_document", {
                path,
              })
              const pages = await renderPdfPresentationPages(
                pdfData,
                documentId,
                path,
                (page, pageCount) => {
                  usePresentationStore
                    .getState()
                    .appendDocumentPage(documentId, page, pageCount)
                }
              )
              if (pages.length === 0) {
                throw new Error("The document did not contain any pages.")
              }
              importedDocuments += 1
              importedPages += pages.length
              usePresentationStore.getState().completeDocumentImport(documentId)
            } catch (error) {
              failedDocuments += 1
              const message = errorMessage(error)
              firstError ||= message
              usePresentationStore
                .getState()
                .failDocumentImport(documentId, message)
            }
          }

          if (importedDocuments > 0) {
            toast.success(
              `Imported ${importedDocuments} document${importedDocuments === 1 ? "" : "s"} (${importedPages} page${importedPages === 1 ? "" : "s"}).`
            )
          }
          if (failedDocuments > 0) {
            toast.error(
              failedDocuments === 1
                ? firstError
                : `${failedDocuments} documents could not be imported. ${firstError}`
            )
          }
        } finally {
          setIsImportingDocuments(false)
        }
      })().catch((error: unknown) => {
        setIsImportingDocuments(false)
        toast.error(errorMessage(error))
      })
    },
    []
  )

  return { importPresentationDocuments, isImportingDocuments }
}
