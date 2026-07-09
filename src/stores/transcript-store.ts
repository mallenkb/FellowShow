import { create } from "zustand"
import { load, type Store } from "@tauri-apps/plugin-store"
import type { TranscriptSegment } from "@/types"

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error"

interface TranscriptState {
  segments: TranscriptSegment[]
  currentPartial: string
  isTranscribing: boolean
  connectionStatus: ConnectionStatus

  addSegment: (segment: TranscriptSegment) => void
  setPartial: (text: string) => void
  setTranscribing: (transcribing: boolean) => void
  setConnectionStatus: (status: ConnectionStatus) => void
  replaceSegments: (segments: TranscriptSegment[]) => void
  clearTranscript: () => void
}

const TRANSCRIPT_STORE_FILE = "transcript-sessions.json"
const TRANSCRIPT_STORE_KEY = "segments"
const MAX_STORED_SEGMENTS = 2_000
const SAVE_DEBOUNCE_MS = 500

let tauriStore: Store | null = null
let saveTimer: ReturnType<typeof setTimeout> | null = null
let pendingSave: Promise<void> = Promise.resolve()

async function getStore(): Promise<Store> {
  if (!tauriStore) {
    tauriStore = await load(TRANSCRIPT_STORE_FILE, {
      autoSave: false,
      defaults: {},
    })
  }
  return tauriStore
}

async function persistSegments(segments: TranscriptSegment[]): Promise<void> {
  try {
    const store = await getStore()
    await store.set(TRANSCRIPT_STORE_KEY, segments.slice(-MAX_STORED_SEGMENTS))
    await store.save()
  } catch {
    console.warn("[transcript] Failed to persist transcript session history")
  }
}

export async function resetTranscriptSession(): Promise<void> {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }

  useTranscriptStore.setState({
    segments: [],
    currentPartial: "",
    isTranscribing: false,
    connectionStatus: "disconnected",
  })
  await persistSegments([])
}

export async function initTranscriptPersistence(): Promise<void> {
  try {
    await getStore()
    useTranscriptStore.subscribe((state, prevState) => {
      if (state.segments === prevState.segments) return

      if (saveTimer) {
        clearTimeout(saveTimer)
      }
      saveTimer = setTimeout(() => {
        saveTimer = null
        pendingSave = pendingSave.then(() =>
          persistSegments(state.segments.slice(-MAX_STORED_SEGMENTS))
        )
      }, SAVE_DEBOUNCE_MS)
    })
  } catch {
    console.warn(
      "[transcript] Failed to initialize transcript persistence subscription"
    )
  }
}

export const useTranscriptStore = create<TranscriptState>((set) => ({
  segments: [],
  currentPartial: "",
  isTranscribing: false,
  connectionStatus: "disconnected",

  addSegment: (segment) =>
    set((state) => ({
      segments: [...state.segments, segment],
      currentPartial: "",
    })),
  setPartial: (currentPartial) => set({ currentPartial }),
  setTranscribing: (isTranscribing) => set({ isTranscribing }),
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  replaceSegments: (segments) => set({ segments }),
  clearTranscript: () => {
    set({ segments: [], currentPartial: "" })
    void persistSegments([])
  },
}))
