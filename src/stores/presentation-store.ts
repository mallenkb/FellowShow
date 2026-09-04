import { create } from "zustand"
import { toast } from "sonner"
import { sanitizeSlides, storedSlides } from "@/lib/presentation-storage"
import { remove } from "@tauri-apps/plugin-fs"
import { load, type Store } from "@tauri-apps/plugin-store"
import {
  arrangeMedia,
  slideLayers,
  type PresentationLayer,
} from "@/lib/presentation-composition"
import { clampPresentationMediaTransform } from "@/lib/presentation-media-transform"

export interface PresentationSlide {
  id: string
  name: string
  url: string
  mediaType?: "image" | "video"
  playbackStartedAt?: number
  createdAt: number
  pinned: boolean
  locked: boolean
  fit: "contain" | "cover" | "stretch"
  scale: number
  offsetX: number
  offsetY: number
  layers?: PresentationLayer[]
}

export interface PresentationPage {
  id: string
  documentId: string
  pageNumber: number
  name: string
  url: string
  cachedPath: string | null
  width: number
  height: number
  fit: "contain" | "cover" | "stretch"
  scale: number
  offsetX: number
  offsetY: number
}

export interface PresentationDocument {
  id: string
  name: string
  sourcePath: string
  createdAt: number
  status: "importing" | "ready" | "error"
  totalPages: number
  pages: PresentationPage[]
  error: string | null
}

interface PresentationState {
  tickerText: string
  slides: PresentationSlide[]
  documents: PresentationDocument[]
  selectedSlideId: string | null
  selectedDocumentId: string | null
  selectedPageId: string | null
  addSlides: (slides: PresentationSlide[]) => void
  addSlideMedia: (id: string, media: PresentationLayer[]) => boolean
  updateSlideLayer: (
    id: string,
    layerId: string,
    patch: Partial<
      Pick<PresentationLayer, "fit" | "scale" | "offsetX" | "offsetY">
    >
  ) => void
  removeSlideLayer: (id: string, layerId: string) => void
  arrangeSlideMedia: (id: string) => void
  selectSlide: (id: string | null) => void
  renameSlide: (id: string, name: string) => void
  togglePin: (id: string) => void
  toggleLock: (id: string) => void
  reorderSlides: (
    fromId: string,
    toId: string,
    position?: "before" | "after"
  ) => void
  removeSlide: (id: string) => void
  startDocumentImport: (document: PresentationDocument) => void
  appendDocumentPage: (
    documentId: string,
    page: PresentationPage,
    totalPages: number
  ) => void
  completeDocumentImport: (documentId: string) => void
  failDocumentImport: (documentId: string, error: string) => void
  selectDocument: (id: string | null) => void
  selectDocumentPage: (documentId: string, pageId: string) => void
  updateDocumentTransform: (
    documentId: string,
    transform: Partial<
      Pick<PresentationPage, "fit" | "scale" | "offsetX" | "offsetY">
    >
  ) => void
  removeDocument: (id: string) => void
}

function revokeObjectUrl(url: string) {
  if (!url.startsWith("blob:") || typeof URL === "undefined") return
  URL.revokeObjectURL(url)
}

function findLastPinnedIndex(slides: PresentationSlide[]) {
  for (let index = slides.length - 1; index >= 0; index -= 1) {
    if (slides[index]?.pinned) return index
  }
  return -1
}

function removeCachedDocumentPages(document: PresentationDocument) {
  const removals = document.pages.flatMap((page) =>
    page.cachedPath ? [remove(page.cachedPath)] : []
  )
  if (removals.length === 0) return
  void Promise.all(removals).catch((error: unknown) => {
    console.warn(
      "[presentations] Failed to remove cached document pages",
      error
    )
  })
}

export const usePresentationStore = create<PresentationState>((set, get) => ({
  tickerText: "",
  slides: [],
  documents: [],
  selectedSlideId: null,
  selectedDocumentId: null,
  selectedPageId: null,

  addSlideMedia: (id, media) => {
    const slide = get().slides.find((item) => item.id === id)
    if (!slide || slide.locked || slideLayers(slide).length + media.length > 16)
      return false
    const layers = [
      ...slideLayers(slide),
      ...media.map((item) => ({
        ...item,
        playbackStartedAt: item.mediaType === "video" ? Date.now() : undefined,
      })),
    ]
    set((state) => ({
      slides: state.slides.map((item) =>
        item.id === id ? { ...item, layers: arrangeMedia(layers) } : item
      ),
    }))
    return true
  },

  updateSlideLayer: (id, layerId, patch) =>
    set((state) => ({
      slides: state.slides.map((slide) => {
        if (slide.id !== id || slide.locked) return slide
        if (!slide.layers?.length && slide.id === layerId) {
          return {
            ...slide,
            ...patch,
            ...clampPresentationMediaTransform({ ...slide, ...patch }),
          }
        }
        return {
          ...slide,
          layers: slideLayers(slide).map((layer) =>
            layer.id === layerId
              ? {
                  ...layer,
                  ...patch,
                  ...clampPresentationMediaTransform({ ...layer, ...patch }),
                }
              : layer
          ),
        }
      }),
    })),

  removeSlideLayer: (id, layerId) =>
    set((state) => ({
      slides: state.slides.map((slide) => {
        if (slide.id !== id || slide.locked) return slide
        const layers = slideLayers(slide)
        if (layers.length <= 1) return slide
        // A live output may still hold this URL. Keep its media valid until the session ends.
        return {
          ...slide,
          layers: layers.filter((layer) => layer.id !== layerId),
        }
      }),
    })),

  arrangeSlideMedia: (id) =>
    set((state) => ({
      slides: state.slides.map((slide) =>
        slide.id === id && !slide.locked
          ? { ...slide, layers: arrangeMedia(slideLayers(slide)) }
          : slide
      ),
    })),

  addSlides: (slides) =>
    set((state) => {
      const playbackStartedAt = Date.now()
      const normalizedSlides = slides.map((slide) =>
        slide.mediaType === "video" && slide.playbackStartedAt === undefined
          ? { ...slide, playbackStartedAt }
          : slide
      )
      return {
        slides: [...state.slides, ...normalizedSlides],
        selectedSlideId: normalizedSlides[0]?.id ?? state.selectedSlideId,
        selectedDocumentId:
          normalizedSlides.length > 0 ? null : state.selectedDocumentId,
        selectedPageId:
          normalizedSlides.length > 0 ? null : state.selectedPageId,
      }
    }),

  selectSlide: (selectedSlideId) =>
    set(
      selectedSlideId
        ? { selectedSlideId, selectedDocumentId: null, selectedPageId: null }
        : { selectedSlideId: null }
    ),

  renameSlide: (id, name) =>
    set((state) => ({
      slides: state.slides.map((slide) =>
        slide.id === id && !slide.locked ? { ...slide, name } : slide
      ),
    })),

  togglePin: (id) =>
    set((state) => {
      const slideIndex = state.slides.findIndex((slide) => slide.id === id)
      if (slideIndex === -1) return state

      const slide = state.slides[slideIndex]
      if (slide.locked) return state
      const slides = [...state.slides]
      slides.splice(slideIndex, 1)

      const lastPinnedIndex = findLastPinnedIndex(slides)
      slides.splice(lastPinnedIndex + 1, 0, {
        ...slide,
        pinned: !slide.pinned,
      })
      return { slides }
    }),

  toggleLock: (id) =>
    set((state) => ({
      slides: state.slides.map((slide) =>
        slide.id === id ? { ...slide, locked: !slide.locked } : slide
      ),
    })),

  reorderSlides: (fromId, toId, position = "before") =>
    set((state) => {
      const fromIndex = state.slides.findIndex((slide) => slide.id === fromId)
      const toIndex = state.slides.findIndex((slide) => slide.id === toId)
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
        return state
      }
      if (state.slides[fromIndex]?.locked || state.slides[toIndex]?.locked) {
        return state
      }

      const slides = [...state.slides]
      const [moved] = slides.splice(fromIndex, 1)
      const targetIndex = slides.findIndex((slide) => slide.id === toId)
      if (!moved || targetIndex === -1) return state
      slides.splice(
        position === "after" ? targetIndex + 1 : targetIndex,
        0,
        moved
      )
      return { slides }
    }),

  removeSlide: (id) =>
    set((state) => {
      const removedSlide = state.slides.find((slide) => slide.id === id)
      if (removedSlide?.locked) return state
      if (removedSlide) revokeObjectUrl(removedSlide.url)

      const slides = state.slides.filter((slide) => slide.id !== id)
      const selectedSlideId =
        state.selectedSlideId === id
          ? (slides[0]?.id ?? null)
          : state.selectedSlideId
      return { slides, selectedSlideId }
    }),

  startDocumentImport: (document) =>
    set((state) => ({
      documents: [...state.documents, document],
      selectedDocumentId: document.id,
      selectedPageId: null,
      selectedSlideId: null,
    })),

  appendDocumentPage: (documentId, page, totalPages) =>
    set((state) => ({
      documents: state.documents.map((document) =>
        document.id === documentId
          ? {
              ...document,
              totalPages,
              pages: [
                ...document.pages,
                document.pages[0]
                  ? {
                      ...page,
                      fit: document.pages[0].fit,
                      scale: document.pages[0].scale,
                      offsetX: document.pages[0].offsetX,
                      offsetY: document.pages[0].offsetY,
                    }
                  : page,
              ],
            }
          : document
      ),
      selectedPageId:
        state.selectedDocumentId === documentId && !state.selectedPageId
          ? page.id
          : state.selectedPageId,
    })),

  completeDocumentImport: (documentId) =>
    set((state) => ({
      documents: state.documents.map((document) =>
        document.id === documentId
          ? { ...document, status: "ready", error: null }
          : document
      ),
    })),

  failDocumentImport: (documentId, error) =>
    set((state) => ({
      documents: state.documents.map((document) =>
        document.id === documentId
          ? { ...document, status: "error", error }
          : document
      ),
    })),

  selectDocument: (selectedDocumentId) =>
    set((state) => {
      const document = state.documents.find(
        (candidate) => candidate.id === selectedDocumentId
      )
      return {
        selectedDocumentId: document?.id ?? null,
        selectedPageId: document?.pages[0]?.id ?? null,
        selectedSlideId: document ? null : state.selectedSlideId,
      }
    }),

  selectDocumentPage: (documentId, selectedPageId) =>
    set((state) => {
      const document = state.documents.find(
        (candidate) => candidate.id === documentId
      )
      if (!document?.pages.some((page) => page.id === selectedPageId)) {
        return state
      }
      return {
        selectedDocumentId: documentId,
        selectedPageId,
        selectedSlideId: null,
      }
    }),

  updateDocumentTransform: (documentId, transform) =>
    set((state) => ({
      documents: state.documents.map((document) =>
        document.id === documentId
          ? {
              ...document,
              pages: document.pages.map((page) => ({ ...page, ...transform })),
            }
          : document
      ),
    })),

  removeDocument: (id) =>
    set((state) => {
      const removed = state.documents.find((document) => document.id === id)
      if (removed) removeCachedDocumentPages(removed)
      const documents = state.documents.filter((document) => document.id !== id)
      const fallback = documents[0] ?? null
      const wasSelected = state.selectedDocumentId === id
      return {
        documents,
        selectedDocumentId: wasSelected
          ? (fallback?.id ?? null)
          : state.selectedDocumentId,
        selectedPageId: wasSelected
          ? (fallback?.pages[0]?.id ?? null)
          : state.selectedPageId,
      }
    }),
}))

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function sanitizePage(
  value: unknown,
  documentId: string
): PresentationPage | null {
  if (!isRecord(value)) return null
  if (
    typeof value.id !== "string" ||
    typeof value.pageNumber !== "number" ||
    typeof value.name !== "string" ||
    typeof value.url !== "string" ||
    typeof value.width !== "number" ||
    typeof value.height !== "number"
  ) {
    return null
  }
  return {
    id: value.id,
    documentId,
    pageNumber: Math.max(1, Math.trunc(value.pageNumber)),
    name: value.name,
    url: value.url,
    cachedPath: typeof value.cachedPath === "string" ? value.cachedPath : null,
    width: Math.max(1, value.width),
    height: Math.max(1, value.height),
    fit:
      value.fit === "cover" || value.fit === "stretch" ? value.fit : "contain",
    scale:
      typeof value.scale === "number"
        ? Math.min(2.5, Math.max(0.5, value.scale))
        : 1,
    offsetX: typeof value.offsetX === "number" ? value.offsetX : 0,
    offsetY: typeof value.offsetY === "number" ? value.offsetY : 0,
  }
}

function sanitizeDocuments(value: unknown): PresentationDocument[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((candidate) => {
    if (
      !isRecord(candidate) ||
      typeof candidate.id !== "string" ||
      typeof candidate.name !== "string" ||
      typeof candidate.sourcePath !== "string" ||
      typeof candidate.createdAt !== "number" ||
      !Array.isArray(candidate.pages)
    ) {
      return []
    }
    const documentId = candidate.id
    const pages = candidate.pages
      .map((page) => sanitizePage(page, documentId))
      .filter((page): page is PresentationPage => page !== null)
      .sort((left, right) => left.pageNumber - right.pageNumber)
    if (pages.length === 0) return []
    return [
      {
        id: documentId,
        name: candidate.name,
        sourcePath: candidate.sourcePath,
        createdAt: candidate.createdAt,
        status: "ready" as const,
        totalPages: pages.length,
        pages,
        error: null,
      },
    ]
  })
}

let persistedStore: Store | null = null
let documentHydration: Promise<void> | null = null
let saveTimer: ReturnType<typeof setTimeout> | null = null
let pendingSave: Promise<void> = Promise.resolve()

async function getPersistedStore() {
  if (!persistedStore) {
    persistedStore = await load("presentation-documents.json", {
      autoSave: false,
      defaults: {},
    })
  }
  return persistedStore
}

async function persistDocuments(state: PresentationState) {
  const store = await getPersistedStore()
  await store.set("version", 2)
  await store.set("slides", storedSlides(state.slides))
  await store.set("selectedSlideId", state.selectedSlideId)
  await store.set("tickerText", state.tickerText)
  await store.set(
    "documents",
    state.documents.filter((document) => document.status === "ready")
  )
  await store.set("selectedDocumentId", state.selectedDocumentId)
  await store.set("selectedPageId", state.selectedPageId)
  await store.save()
}

export function hydratePresentationDocuments(): Promise<void> {
  if (documentHydration) return documentHydration
  documentHydration = (async () => {
    const initial = usePresentationStore.getState()
    try {
      const store = await getPersistedStore()
      const version = await store.get<unknown>("version")
      if (typeof version === "number" && version > 2)
        throw new Error("Presentation data was saved by a newer app version")
      const documents = sanitizeDocuments(await store.get<unknown>("documents"))
      const slides = sanitizeSlides(await store.get<unknown>("slides"))
      const storedSlideId = await store.get<unknown>("selectedSlideId")
      const tickerText = await store.get<unknown>("tickerText")
      const storedDocumentId = await store.get<unknown>("selectedDocumentId")
      const selectedDocument =
        documents.find((document) => document.id === storedDocumentId) ??
        documents[0] ??
        null
      const storedPageId = await store.get<unknown>("selectedPageId")
      const selectedPage =
        selectedDocument?.pages.find((page) => page.id === storedPageId) ??
        selectedDocument?.pages[0] ??
        null

      const current = usePresentationStore.getState()
      const interacted = current !== initial
      usePresentationStore.setState({
        documents: [
          ...documents.filter(
            (item) =>
              !current.documents.some((existing) => existing.id === item.id)
          ),
          ...current.documents,
        ],
        slides: [
          ...slides.filter(
            (item) =>
              !current.slides.some((existing) => existing.id === item.id)
          ),
          ...current.slides,
        ],
        ...(!interacted
          ? {
              selectedSlideId:
                slides.find((slide) => slide.id === storedSlideId)?.id ?? null,
              selectedDocumentId: slides.some(
                (slide) => slide.id === storedSlideId
              )
                ? null
                : (selectedDocument?.id ?? null),
              selectedPageId: slides.some((slide) => slide.id === storedSlideId)
                ? null
                : (selectedPage?.id ?? null),
              tickerText: typeof tickerText === "string" ? tickerText : "",
            }
          : {}),
      })
      usePresentationStore.subscribe((state, previous) => {
        if (
          state.documents === previous.documents &&
          state.slides === previous.slides &&
          state.selectedSlideId === previous.selectedSlideId &&
          state.tickerText === previous.tickerText &&
          state.selectedDocumentId === previous.selectedDocumentId &&
          state.selectedPageId === previous.selectedPageId
        ) {
          return
        }
        if (saveTimer) clearTimeout(saveTimer)
        saveTimer = setTimeout(() => {
          saveTimer = null
          pendingSave = pendingSave
            .then(() => persistDocuments(usePresentationStore.getState()))
            .catch((error: unknown) => {
              console.warn("[presentations] Failed to persist documents", error)
              toast.error(
                "Could not save presentations. Keep the app open and try again."
              )
            })
        }, 500)
      })
    } catch (error) {
      console.warn("[presentations] Failed to hydrate documents", error)
      toast.error(
        "Could not restore presentations. New changes will not be saved this session."
      )
    }
  })()
  return documentHydration
}
