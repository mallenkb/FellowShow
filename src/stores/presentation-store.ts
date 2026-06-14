import { create } from "zustand"

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

interface PresentationState {
  tickerText: string
  slides: PresentationSlide[]
  selectedSlideId: string | null
  addSlides: (slides: PresentationSlide[]) => void
  selectSlide: (id: string | null) => void
  renameSlide: (id: string, name: string) => void
  setSlideFit: (id: string, fit: PresentationSlide["fit"]) => void
  updateSlideTransform: (
    id: string,
    transform: Partial<Pick<PresentationSlide, "scale" | "offsetX" | "offsetY">>,
  ) => void
  setTickerText: (text: string) => void
  togglePin: (id: string) => void
  toggleLock: (id: string) => void
  reorderSlides: (fromId: string, toId: string, position?: "before" | "after") => void
  removeSlide: (id: string) => void
  clearSlides: () => void
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

export const usePresentationStore = create<PresentationState>((set) => ({
  tickerText: "",
  slides: [],
  selectedSlideId: null,

  addSlides: (slides) =>
    set((state) => ({
      slides: [...state.slides, ...slides],
      selectedSlideId: slides[0]?.id ?? state.selectedSlideId,
    })),

  selectSlide: (selectedSlideId) => set({ selectedSlideId }),

  renameSlide: (id, name) =>
    set((state) => ({
      slides: state.slides.map((slide) =>
        slide.id === id && !slide.locked ? { ...slide, name } : slide,
      ),
    })),

  setSlideFit: (id, fit) =>
    set((state) => ({
      slides: state.slides.map((slide) =>
        slide.id === id && !slide.locked ? { ...slide, fit } : slide,
      ),
    })),

  updateSlideTransform: (id, transform) =>
    set((state) => ({
      slides: state.slides.map((slide) =>
        slide.id === id && !slide.locked
          ? { ...slide, ...transform }
          : slide,
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

      if (slide.pinned) {
        const lastPinnedIndex = findLastPinnedIndex(slides)
        slides.splice(lastPinnedIndex + 1, 0, { ...slide, pinned: false })
      } else {
        const lastPinnedIndex = findLastPinnedIndex(slides)
        slides.splice(lastPinnedIndex + 1, 0, { ...slide, pinned: true })
      }

      return { slides }
    }),

  toggleLock: (id) =>
    set((state) => ({
      slides: state.slides.map((slide) =>
        slide.id === id ? { ...slide, locked: !slide.locked } : slide,
      ),
    })),

  reorderSlides: (fromId, toId, position = "before") =>
    set((state) => {
      const fromIndex = state.slides.findIndex((slide) => slide.id === fromId)
      const toIndex = state.slides.findIndex((slide) => slide.id === toId)
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return state
      if (state.slides[fromIndex]?.locked || state.slides[toIndex]?.locked) return state

      const slides = [...state.slides]
      const [moved] = slides.splice(fromIndex, 1)
      const targetIndex = slides.findIndex((slide) => slide.id === toId)
      if (targetIndex === -1) return state
      slides.splice(position === "after" ? targetIndex + 1 : targetIndex, 0, moved)
      return { slides }
    }),

  removeSlide: (id) =>
    set((state) => {
      const removedSlide = state.slides.find((slide) => slide.id === id)
      if (removedSlide?.locked) return state
      if (removedSlide) revokeObjectUrl(removedSlide.url)

      const slides = state.slides.filter((slide) => slide.id !== id)
      const selectedSlideId =
        state.selectedSlideId === id ? slides[0]?.id ?? null : state.selectedSlideId
      return { slides, selectedSlideId }
    }),

  clearSlides: () =>
    set((state) => {
      state.slides.forEach((slide) => revokeObjectUrl(slide.url))
      return { slides: [], selectedSlideId: null, tickerText: "" }
    }),
  setTickerText: (tickerText) =>
    set({
      tickerText,
    }),
}))
