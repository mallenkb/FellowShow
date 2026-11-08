import { useCallback } from "react"
import { invoke } from "@/lib/ipc"
import { waitForStartup } from "@/lib/startup-ready"
import { toast } from "sonner"
import {
  hydrateSettings,
  unlockSecureSettings,
  useSettingsStore,
} from "@/stores/settings-store"
import { useTranscriptStore } from "@/stores/transcript-store"
import { useAudioStore } from "@/stores/audio-store"
import {
  checkpointActiveSermon,
  flushSermonSessions,
  useSermonStore,
} from "@/stores/sermon-store"
import { useTauriEvent } from "./use-tauri-event"

interface TranscriptPartialPayload {
  text: string
  is_final: boolean
  confidence: number
  timestamp?: number | null
}

export type TranscriptionKeyService = "Deepgram" | "OpenAI" | "Groq"

interface UseTranscriptionOptions {
  /**
   * Called when the selected transcription provider needs an API key.
   */
  onMissingApiKey?: (service: TranscriptionKeyService) => void
}

const NOT_RUNNING_ERROR = "Transcription is not running"
const PREPARATION_TIMEOUT_MS = 20_000
const STOP_TIMEOUT_MS = 15_000
let startPromise: Promise<void> | null = null
let stopPromise: Promise<void> | null = null
let nativeSessionId: number | null = null
let awaitingNativeStart = false
const stoppedDuringStart = new Set<number>()
let currentStart: { cancelled: boolean; cancelPreparation: () => void } | null =
  null

function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  message: string
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined
  const deadline = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(message)), timeoutMs)
  })
  return Promise.race([operation, deadline]).finally(() => {
    if (timeout !== undefined) clearTimeout(timeout)
  })
}

function markTranscriptionStopped(): void {
  const transcript = useTranscriptStore.getState()
  transcript.setTranscribing(false)
  transcript.setPartial("")
  transcript.setConnectionStatus("disconnected")
  useAudioStore.getState().setLevel({ rms: 0, peak: 0 })
}

function handleTranscriptionStopped(sessionId: number | undefined): void {
  if (typeof sessionId !== "number") {
    nativeSessionId = null
    markTranscriptionStopped()
    return
  }
  if (sessionId === nativeSessionId) {
    const unexpected = !stopPromise && !currentStart
    nativeSessionId = null
    markTranscriptionStopped()
    if (unexpected) {
      const state = useSermonStore.getState()
      if (
        state.activeSessionId &&
        state.transition !== "pausing" &&
        state.transition !== "ending"
      ) {
        const id = state.activeSessionId
        checkpointActiveSermon()
        useSermonStore.getState().pauseSession(id, true)
        void flushSermonSessions().catch((error: unknown) => {
          toast.error("Could not save the paused sermon", {
            description: String(error),
          })
        })
        toast.warning("Listening stopped", {
          description: "Your sermon is paused. Continue it when you are ready.",
        })
      }
    }
  } else if (awaitingNativeStart) {
    stoppedDuringStart.add(sessionId)
  }
}

export const transcriptionActions = {
  async start(
    onMissingApiKey?: (service: TranscriptionKeyService) => void,
    sermonId?: string
  ): Promise<void> {
    if (startPromise) return startPromise
    const current = useTranscriptStore.getState()
    if (
      !stopPromise &&
      (current.isTranscribing || current.connectionStatus === "connecting")
    ) {
      return
    }

    let cancelPreparation = () => {}
    const preparationCancelled = new Promise<void>((resolve) => {
      cancelPreparation = resolve
    })
    const start = { cancelled: false, cancelPreparation }
    currentStart = start
    useTranscriptStore.setState({ transition: "starting" })
    startPromise = (async () => {
      if (stopPromise) {
        try {
          await stopPromise
        } catch {
          return
        }
      }
      if (start.cancelled) return

      try {
        await withTimeout(
          Promise.race([
            (async () => {
              await waitForStartup()
              if (start.cancelled) return
              await hydrateSettings()
              if (start.cancelled) return
              if (useSettingsStore.getState().sttProvider !== "whisper") {
                await unlockSecureSettings()
              }
            })(),
            preparationCancelled,
          ]),
          PREPARATION_TIMEOUT_MS,
          "Preparing transcription timed out. Check for a system permission prompt and try again."
        )
        if (start.cancelled) {
          markTranscriptionStopped()
          return
        }
        const transcript = useTranscriptStore.getState()
        if (transcript.isTranscribing) return
        transcript.setConnectionStatus("connecting")

        const settings = useSettingsStore.getState()
        const apiKey =
          settings.sttProvider === "deepgram"
            ? (settings.deepgramApiKey ?? "")
            : settings.sttProvider === "openai"
              ? (settings.openaiApiKey ?? "")
              : settings.sttProvider === "groq"
                ? (settings.groqApiKey ?? "")
                : ""

        const localModelOptions = settings.localSpeechModel
          ? { localSpeechModel: settings.localSpeechModel }
          : settings.whisperModel === "small.en"
            ? { whisperModel: settings.whisperModel }
            : {}

        transcript.setTranscribing(true)
        awaitingNativeStart = true
        stoppedDuringStart.clear()
        const sessionId = await invoke("start_transcription", {
          apiKey,
          deviceId: settings.audioDeviceId,
          gain: settings.gain,
          provider: settings.sttProvider,
          ...(sermonId ? { sermonId } : {}),
          ...(settings.sttProvider === "whisper" ? localModelOptions : {}),
        })
        awaitingNativeStart = false
        nativeSessionId = typeof sessionId === "number" ? sessionId : null
        if (
          nativeSessionId !== null &&
          stoppedDuringStart.has(nativeSessionId)
        ) {
          nativeSessionId = null
          markTranscriptionStopped()
        }
        stoppedDuringStart.clear()
      } catch (e) {
        awaitingNativeStart = false
        stoppedDuringStart.clear()
        if (start.cancelled) {
          markTranscriptionStopped()
          return
        }
        const msg = String(e)
        const transcript = useTranscriptStore.getState()
        transcript.setTranscribing(false)
        transcript.setConnectionStatus("error")
        useAudioStore.getState().setLevel({ rms: 0, peak: 0 })
        const missingKey = /No (Deepgram|OpenAI|Groq) API key/.exec(msg)?.[1]
        if (missingKey && onMissingApiKey) {
          onMissingApiKey(missingKey as TranscriptionKeyService)
        } else {
          toast.error("Could not start transcription", { description: msg })
        }
      }
    })().finally(() => {
      startPromise = null
      if (currentStart === start) currentStart = null
      if (useTranscriptStore.getState().transition === "starting") {
        useTranscriptStore.setState({ transition: null })
      }
    })

    return startPromise
  },

  async stop(): Promise<void> {
    if (currentStart) {
      currentStart.cancelled = true
      currentStart.cancelPreparation()
    }
    if (stopPromise) {
      await stopPromise
      if (startPromise) await startPromise
      return
    }
    useTranscriptStore.setState({ transition: "stopping" })
    stopPromise = (async () => {
      if (startPromise) await startPromise
      const transcript = useTranscriptStore.getState()
      if (
        !transcript.isTranscribing &&
        transcript.connectionStatus === "disconnected" &&
        nativeSessionId === null
      ) {
        useAudioStore.getState().setLevel({ rms: 0, peak: 0 })
        return
      }
      try {
        await withTimeout(
          invoke("stop_transcription"),
          STOP_TIMEOUT_MS,
          "Transcription did not stop in time. Try stopping it again."
        )
      } catch (e) {
        if (String(e) !== NOT_RUNNING_ERROR) {
          transcript.setConnectionStatus("error")
          toast.error("Could not stop transcription", {
            description: String(e),
          })
          throw e
        }
      }
      nativeSessionId = null
      markTranscriptionStopped()
    })().finally(() => {
      stopPromise = null
      if (useTranscriptStore.getState().transition === "stopping") {
        useTranscriptStore.setState({ transition: null })
      }
    })

    return stopPromise
  },
}

export function useTranscription(options?: UseTranscriptionOptions) {
  const segments = useTranscriptStore((s) => s.segments)
  const isTranscribing = useTranscriptStore((s) => s.isTranscribing)
  const connectionStatus = useTranscriptStore((s) => s.connectionStatus)
  const transition = useTranscriptStore((s) => s.transition)

  // STT lifecycle events
  useTauriEvent("stt_connected", () => {
    const store = useTranscriptStore.getState()
    if (store.isTranscribing) store.setConnectionStatus("connected")
  })
  useTauriEvent("stt_disconnected", () => {
    const store = useTranscriptStore.getState()
    if (store.isTranscribing) store.setConnectionStatus("disconnected")
  })
  useTauriEvent<number>("stt_stopped", handleTranscriptionStopped)
  useTauriEvent<string>("sermon_audio_error", (description) => {
    toast.error("Sermon audio recording issue", { description })
  })
  useTauriEvent<string>("stt_error", (msg) => {
    const store = useTranscriptStore.getState()
    if (!store.isTranscribing && store.transition !== "starting") return
    store.setConnectionStatus("error")
    toast.error("Transcription error", { description: msg })
  })

  useTauriEvent<TranscriptPartialPayload>("transcript_partial", (payload) => {
    const store = useTranscriptStore.getState()
    if (
      store.isTranscribing ||
      store.connectionStatus === "connecting" ||
      store.connectionStatus === "connected"
    )
      store.setPartial(payload.text)
  })

  useTauriEvent<TranscriptPartialPayload>("transcript_final", (payload) => {
    const store = useTranscriptStore.getState()
    if (
      !store.isTranscribing &&
      store.connectionStatus !== "connecting" &&
      store.connectionStatus !== "connected"
    )
      return
    useTranscriptStore.getState().addSegment({
      id: crypto.randomUUID(),
      text: payload.text,
      is_final: true,
      confidence: payload.confidence,
      words: [],
      timestamp: payload.timestamp ?? Date.now(),
    })
  })

  const onMissingApiKey = options?.onMissingApiKey

  const startTranscription = useCallback(
    () => transcriptionActions.start(onMissingApiKey),
    [onMissingApiKey]
  )
  const stopTranscription = useCallback(() => transcriptionActions.stop(), [])

  return {
    segments,
    isTranscribing,
    connectionStatus,
    transition,
    startTranscription,
    stopTranscription,
  }
}
