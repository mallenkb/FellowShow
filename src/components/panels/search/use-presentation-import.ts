import { useCallback, useRef } from "react"
import { isTauri } from "@tauri-apps/api/core"
import { open } from "@tauri-apps/plugin-dialog"
import { toast } from "sonner"
import { PRESENTATION_DOCUMENT_EXTENSIONS } from "@/lib/presentation-documents"
import {
  cachePresentationMedia,
  cachePresentationMediaPath,
} from "@/lib/presentation-media"
import {
  type PresentationSlide,
  usePresentationStore,
} from "@/stores/presentation-store"
import { usePresentationDocumentImport } from "./use-presentation-document-import"

const MEDIA_EXTENSIONS = [
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "svg",
  "mp4",
  "mov",
  "m4v",
  "webm",
] as const
const MEDIA_EXTENSION_SET = new Set<string>(MEDIA_EXTENSIONS)
const VIDEO_EXTENSIONS = new Set(["mp4", "mov", "m4v", "webm"])

export const PRESENTATION_FILE_ACCEPT =
  "image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.odt,.odp,.ods,.rtf"

function extensionOf(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? ""
}

function createSlide(
  name: string,
  url: string,
  mediaType: "image" | "video"
): PresentationSlide {
  return {
    id: crypto.randomUUID(),
    name: name.replace(/\.[^.]+$/, ""),
    url,
    mediaType,
    createdAt: Date.now(),
    pinned: false,
    locked: false,
    fit: "contain",
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  }
}

export function usePresentationImport(targetSlideId?: string) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { importPresentationDocuments, isImportingDocuments } =
    usePresentationDocumentImport()

  const addMedia = useCallback(
    (slides: PresentationSlide[]) => {
      if (slides.length === 0) return
      const store = usePresentationStore.getState()
      if (targetSlideId) {
        if (!store.addSlideMedia(targetSlideId, slides)) {
          toast.error(
            "Could not add media. The canvas may be locked, deleted, or exceed 16 items."
          )
        }
      } else {
        store.addSlides(slides)
      }
    },
    [targetSlideId]
  )

  const importFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return

      const mediaFiles = Array.from(files).filter((file) => {
        const extension = extensionOf(file.name)
        return (
          file.type.startsWith("image/") ||
          file.type.startsWith("video/") ||
          MEDIA_EXTENSION_SET.has(extension)
        )
      })

      try {
        if (mediaFiles.length !== files.length) {
          toast.error(
            "Some files are not supported media. Use the desktop file picker to import documents."
          )
        }
        const results = await Promise.allSettled(
          mediaFiles.map(async (file) => {
            const extension = extensionOf(file.name)
            const mediaType =
              file.type.startsWith("video/") || VIDEO_EXTENSIONS.has(extension)
                ? "video"
                : "image"
            const url = await cachePresentationMedia(file, file.name)
            return createSlide(file.name, url, mediaType)
          })
        )
        addMedia(
          results.flatMap((result) =>
            result.status === "fulfilled" ? [result.value] : []
          )
        )
        const failed = results.filter(
          (result) => result.status === "rejected"
        ).length
        if (failed > 0) {
          toast.error(
            `${failed} media file${failed === 1 ? "" : "s"} could not be loaded.${failed < results.length ? " Other files were loaded." : ""}`
          )
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not load media."
        )
      }
    },
    [addMedia]
  )

  const importContent = useCallback(async () => {
    if (!isTauri()) {
      inputRef.current?.click()
      return
    }

    try {
      const selected = await open({
        multiple: true,
        filters: [
          {
            name: targetSlideId ? "Media" : "Media and documents",
            extensions: [
              ...MEDIA_EXTENSIONS,
              ...(targetSlideId ? [] : PRESENTATION_DOCUMENT_EXTENSIONS),
            ],
          },
        ],
      })
      if (!selected) return

      const paths = Array.isArray(selected) ? selected : [selected]
      const documentExtensions = new Set<string>(
        PRESENTATION_DOCUMENT_EXTENSIONS
      )
      const documentPaths: string[] = []
      const mediaSlides: PresentationSlide[] = []

      for (const path of paths) {
        const fileName = path.split(/[/\\]/).pop() ?? path
        const extension = extensionOf(fileName)
        if (documentExtensions.has(extension)) {
          documentPaths.push(path)
        } else if (MEDIA_EXTENSION_SET.has(extension)) {
          try {
            mediaSlides.push(
              createSlide(
                fileName,
                await cachePresentationMediaPath(path),
                VIDEO_EXTENSIONS.has(extension) ? "video" : "image"
              )
            )
          } catch (error) {
            toast.error(`Could not load ${fileName}`, {
              description: String(error),
            })
          }
        }
      }

      if (mediaSlides.length > 0) {
        addMedia(mediaSlides)
      }
      if (documentPaths.length > 0) {
        importPresentationDocuments(documentPaths)
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not select presentation files."
      )
    }
  }, [addMedia, importPresentationDocuments, targetSlideId])

  return { inputRef, importContent, importFiles, isImportingDocuments }
}
