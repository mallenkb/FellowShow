import { create } from "zustand"
import { DEFAULT_PRESENTATION_FONT_FAMILY } from "@/lib/font-options"
import { PRESENTER_TIMER_BACKGROUND_URL } from "@/lib/presenter-timer-background"
import type { PresenterTimerRenderData } from "@/types"

interface PresenterTimerBackgroundOption {
  id: string
  name: string
  url: string
  mediaType: "image" | "video"
  builtin?: boolean
}

const DEFAULT_TIMER_BACKGROUND_OPTION: PresenterTimerBackgroundOption = {
  id: "paint-sweeps-hope",
  name: "Paint Sweeps Hope",
  url: PRESENTER_TIMER_BACKGROUND_URL,
  mediaType: "image",
  builtin: true,
}

interface PresenterTimerState {
  totalSeconds: number
  remainingSeconds: number
  isRunning: boolean
  fontFamily: string
  backgroundUrl: string
  backgroundOptions: PresenterTimerBackgroundOption[]

  setDuration: (seconds: number) => void
  setFontFamily: (fontFamily: string) => void
  setBackgroundUrl: (backgroundUrl: string) => void
  addBackgroundOption: (
    option: Omit<PresenterTimerBackgroundOption, "id"> & { id?: string }
  ) => void
  start: () => void
  pause: () => void
  reset: () => void
  tick: () => void
  getRenderData: () => PresenterTimerRenderData | null
}

const TIMER_BACKGROUND_STORAGE_KEY = "fellowshow.presenterTimer.backgrounds"

function loadPersistedBackgroundState(): Pick<
  PresenterTimerState,
  "backgroundUrl" | "backgroundOptions"
> {
  if (typeof window === "undefined") {
    return {
      backgroundUrl: DEFAULT_TIMER_BACKGROUND_OPTION.url,
      backgroundOptions: [DEFAULT_TIMER_BACKGROUND_OPTION],
    }
  }

  try {
    const raw = window.localStorage.getItem(TIMER_BACKGROUND_STORAGE_KEY)
    if (!raw) {
      return {
        backgroundUrl: DEFAULT_TIMER_BACKGROUND_OPTION.url,
        backgroundOptions: [DEFAULT_TIMER_BACKGROUND_OPTION],
      }
    }

    const parsed = JSON.parse(raw) as Partial<{
      backgroundUrl: string
      backgroundOptions: PresenterTimerBackgroundOption[]
    }>
    const customOptions = Array.isArray(parsed.backgroundOptions)
      ? parsed.backgroundOptions.filter(
          (option) =>
            option &&
            typeof option.id === "string" &&
            typeof option.name === "string" &&
            typeof option.url === "string" &&
            (option.mediaType === "image" || option.mediaType === "video")
        )
      : []
    const backgroundOptions = [
      DEFAULT_TIMER_BACKGROUND_OPTION,
      ...customOptions.filter(
        (option) => option.url !== DEFAULT_TIMER_BACKGROUND_OPTION.url
      ),
    ]
    const backgroundUrl =
      parsed.backgroundUrl &&
      backgroundOptions.some((option) => option.url === parsed.backgroundUrl)
        ? parsed.backgroundUrl
        : DEFAULT_TIMER_BACKGROUND_OPTION.url

    return { backgroundUrl, backgroundOptions }
  } catch {
    return {
      backgroundUrl: DEFAULT_TIMER_BACKGROUND_OPTION.url,
      backgroundOptions: [DEFAULT_TIMER_BACKGROUND_OPTION],
    }
  }
}

function persistBackgroundState(state: PresenterTimerState): void {
  if (typeof window === "undefined") return

  try {
    window.localStorage.setItem(
      TIMER_BACKGROUND_STORAGE_KEY,
      JSON.stringify({
        backgroundUrl: state.backgroundUrl,
        backgroundOptions: state.backgroundOptions.filter(
          (option) => !option.builtin
        ),
      })
    )
  } catch {
    console.warn("[presenter-timer] failed to persist timer backgrounds")
  }
}

export const usePresenterTimerStore = create<PresenterTimerState>(
  (set, get) => {
    const persistedBackgrounds = loadPersistedBackgroundState()

    return {
      totalSeconds: 30,
      remainingSeconds: 30,
      isRunning: false,
      fontFamily: DEFAULT_PRESENTATION_FONT_FAMILY,
      backgroundUrl: persistedBackgrounds.backgroundUrl,
      backgroundOptions: persistedBackgrounds.backgroundOptions,

      setDuration: (seconds) => {
        const totalSeconds = Math.max(1, Math.floor(seconds))
        set((state) => ({
          totalSeconds,
          remainingSeconds: state.isRunning
            ? state.remainingSeconds
            : totalSeconds,
        }))
      },
      setFontFamily: (fontFamily) => set({ fontFamily }),
      setBackgroundUrl: (backgroundUrl) => {
        set({ backgroundUrl })
        persistBackgroundState(get())
      },
      addBackgroundOption: (option) => {
        set((state) => {
          const id = option.id ?? crypto.randomUUID()
          const nextOption = { ...option, id }
          return {
            backgroundUrl: nextOption.url,
            backgroundOptions: [
              ...state.backgroundOptions.filter(
                (existing) => existing.url !== nextOption.url
              ),
              nextOption,
            ],
          }
        })
        persistBackgroundState(get())
      },
      start: () =>
        set((state) => ({
          isRunning: true,
          remainingSeconds:
            state.remainingSeconds > 0
              ? state.remainingSeconds
              : state.totalSeconds,
        })),
      pause: () => set({ isRunning: false }),
      reset: () =>
        set((state) => ({
          isRunning: false,
          remainingSeconds: state.totalSeconds,
        })),
      tick: () =>
        set((state) => {
          if (!state.isRunning) return state
          const remainingSeconds = Math.max(0, state.remainingSeconds - 1)
          return {
            remainingSeconds,
            isRunning: remainingSeconds > 0,
          }
        }),
      getRenderData: () => {
        const state = get()
        if (!state.isRunning && state.remainingSeconds === state.totalSeconds)
          return null
        const selectedBackground =
          state.backgroundOptions.find(
            (option) => option.url === state.backgroundUrl
          ) ?? DEFAULT_TIMER_BACKGROUND_OPTION
        return {
          remainingSeconds: state.remainingSeconds,
          totalSeconds: state.totalSeconds,
          isRunning: state.isRunning,
          isFinished: state.remainingSeconds === 0,
          fontFamily: state.fontFamily,
          backgroundUrl: state.backgroundUrl,
          backgroundMediaType: selectedBackground.mediaType,
        }
      },
    }
  }
)
