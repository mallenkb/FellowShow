import { create } from "zustand"
import { remove } from "@tauri-apps/plugin-fs"
import { load, type Store } from "@tauri-apps/plugin-store"

export interface PresentationSlide {
  id: string
  name: string
  url: string
  mediaType?: "image" | "video"
  createdAt: number
  pinned: boolean
  locked: boolean
  fit: "contain" | "cover" | "stretch"
  scale: number
  offsetX: number
  offsetY: number
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
  selectSlide: (id: string | null) => void
  renameSlide: (id: string, name: string) => void
  setSlideFit: (id: string, fit: PresentationSlide["fit"]) => void
  updateSlideTransform: (
    id: string,
    transform: Partial<Pick<PresentationSlide, "scale" | "offsetX" | "offsetY">>
  ) => void
  setTickerText: (text: string) => void
  togglePin: (id: string) => void
  toggleLock: (id: string) => void
  reorderSlides: (
    fromId: string,
    toId: string,
    position?: "before" | "after"
  ) => void
  removeSlide: (id: string) => void
  clearSlides: () => void
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

export const usePresentationStore = create<PresentationState>((set) => ({
  tickerText: "",
  slides: [],
  documents: [],
  selectedSlideId: null,
  selectedDocumentId: null,
  selectedPageId: null,

  addSlides: (slides) =>
    set((state) => ({
      slides: [...state.slides, ...slides],
      selectedSlideId: slides[0]?.id ?? state.selectedSlideId,
      selectedDocumentId: slides.length > 0 ? null : state.selectedDocumentId,
      selectedPageId: slides.length > 0 ? null : state.selectedPageId,
    })),

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

  setSlideFit: (id, fit) =>
    set((state) => ({
      slides: state.slides.map((slide) =>
        slide.id === id && !slide.locked ? { ...slide, fit } : slide
      ),
    })),

  updateSlideTransform: (id, transform) =>
    set((state) => ({
      slides: state.slides.map((slide) =>
        slide.id === id && !slide.locked ? { ...slide, ...transform } : slide
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

  clearSlides: () =>
    set((state) => {
      state.slides.forEach((slide) => revokeObjectUrl(slide.url))
      return { slides: [], selectedSlideId: null, tickerText: "" }
    }),

  setTickerText: (tickerText) => set({ tickerText }),

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
  await store.set("version", 1)
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
    try {
      const store = await getPersistedStore()
      const documents = sanitizeDocuments(await store.get<unknown>("documents"))
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

      usePresentationStore.setState({
        documents,
        selectedDocumentId: selectedDocument?.id ?? null,
        selectedPageId: selectedPage?.id ?? null,
      })
      usePresentationStore.subscribe((state, previous) => {
        if (
          state.documents === previous.documents &&
          state.selectedDocumentId === previous.selectedDocumentId &&
          state.selectedPageId === previous.selectedPageId
        ) {
          return
        }
        if (saveTimer) clearTimeout(saveTimer)
        saveTimer = setTimeout(() => {
          saveTimer = null
          void persistDocuments(usePresentationStore.getState()).catch(
            (error: unknown) => {
              console.warn("[presentations] Failed to persist documents", error)
            }
          )
        }, 500)
      })
    } catch (error) {
      console.warn("[presentations] Failed to hydrate documents", error)
    }
  })()
  return documentHydration
}
