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
let hydrationPromise: Promise<void> | null = null
let saveTimer: ReturnType<typeof setTimeout> | null = null
let pendingSave: Promise<void> = Promise.resolve()

function sanitizeSegments(value: unknown): TranscriptSegment[] {
  if (!Array.isArray(value)) return []

  const candidates = value.filter(
    (entry): entry is Record<string, unknown> =>
      entry !== null && typeof entry === "object"
  )

  return candidates
    .map((entry) => {
      const id = typeof entry.id === "string" ? entry.id : null
      const text = typeof entry.text === "string" ? entry.text : null
      const is_final = entry.is_final === true
      const confidence =
        typeof entry.confidence === "number" ? entry.confidence : null
      const timestamp =
        typeof entry.timestamp === "number" ? entry.timestamp : null

      if (
        id === null ||
        text === null ||
        !is_final ||
        confidence === null ||
        timestamp === null ||
        !Array.isArray(entry.words)
      ) {
        return null
      }

      const words = entry.words
        .filter((word): word is TranscriptSegment["words"][number] => {
          if (!word || typeof word !== "object") return false
          const w = word as Record<string, unknown>
          return (
            typeof w.text === "string" &&
            typeof w.start === "number" &&
            typeof w.end === "number" &&
            typeof w.confidence === "number" &&
            typeof w.punctuated === "string"
          )
        })
        .map((word) => ({
          text: word.text,
          start: word.start,
          end: word.end,
          confidence: word.confidence,
          punctuated: word.punctuated,
        }))

      return {
        id,
        text,
        is_final: true,
        confidence,
        words,
        timestamp,
      }
    })
    .filter((segment): segment is TranscriptSegment => segment !== null)
    .slice(-MAX_STORED_SEGMENTS)
}

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

export function hydrateTranscriptHistory(): Promise<void> {
  if (hydrationPromise) return hydrationPromise

  hydrationPromise = (async () => {
    try {
      const store = await getStore()
      const value = await store.get(TRANSCRIPT_STORE_KEY)
      useTranscriptStore.setState({
        segments: sanitizeSegments(value),
      })
    } catch {
      console.warn("[transcript] Failed to hydrate transcript history")
    }
  })()

  return hydrationPromise
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
