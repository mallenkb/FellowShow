import { invoke as tauriInvoke, type Channel } from "@tauri-apps/api/core"
import type {
  Book,
  CrossReference,
  DetectionResult,
  DeviceInfo,
  NdiSessionInfo,
  NdiStartRequest,
  SemanticSearchResult,
  SecureSettings,
  PreachingSummary,
  Translation,
  Verse,
} from "@/types"
import type { NdiFrameRequest } from "@/types/ndi"

interface ConnectionTestResult {
  ok: boolean
  message: string
}

export const LOCAL_SPEECH_MODEL_IDS = [
  "nemotron",
  "moonshine",
  "zipformer",
  "voxtral",
  "parakeet",
] as const

export type LocalSpeechModel = (typeof LOCAL_SPEECH_MODEL_IDS)[number]

export interface LocalSpeechModelStatus {
  model: LocalSpeechModel
  installed: boolean
  unavailableReason: string | null
}

export type WhisperModel = "small.en" | "large-v3-turbo"

export interface WhisperModelStatus {
  model: WhisperModel
  sizeBytes: number
  installed: boolean
}

interface EasyWorshipImportedSong {
  id: string
  title: string
  lyrics: string
}

interface DetectionStatus {
  has_direct: boolean
  has_semantic: boolean
  paraphrase_enabled: boolean
}

interface ReadingModeStatus {
  active: boolean
  current_verse: number | null
}

export interface MonitorInfo {
  index: number
  name: string
  width: number
  height: number
  x: number
  y: number
  isPrimary: boolean
}

interface NdiStatus {
  active: boolean
  width: number
  height: number
  fps: number
}

interface RemoteStatus {
  running: boolean
  port: number | null
}

type NoArgs<TResult> = { args: undefined; result: TResult }
type WithArgs<TArgs, TResult> = { args: TArgs; result: TResult }

/** Type contract for every command registered in the Tauri invoke handler. */
export interface Commands {
  set_app_close_guard: WithArgs<{ enabled: boolean }, void>
  close_app: NoArgs<void>
  list_translations: NoArgs<Translation[]>
  prepare_translation_download: NoArgs<number>
  cancel_translation_download: WithArgs<{ downloadId: number }, boolean>
  download_translation: WithArgs<
    { abbreviation: string; downloadId: number },
    Translation
  >
  list_books: WithArgs<{ translationId: number }, Book[]>
  get_chapter: WithArgs<
    { translationId: number; bookNumber: number; chapter: number },
    Verse[]
  >
  get_verse: WithArgs<
    {
      translationId: number
      bookNumber: number
      chapter: number
      verse: number
    },
    Verse | null
  >
  search_verses: WithArgs<
    { query: string; translationId: number; limit: number },
    Verse[]
  >
  get_cross_references: WithArgs<
    { bookNumber: number; chapter: number; verse: number },
    CrossReference[]
  >
  get_active_translation: NoArgs<number>
  set_active_translation: WithArgs<{ translationId: number }, number>
  detect_verses: WithArgs<{ text: string }, DetectionResult[]>
  detection_status: NoArgs<DetectionStatus>
  semantic_search: WithArgs<
    { query: string; limit?: number; translationId?: number },
    SemanticSearchResult[]
  >
  search_scripture_phrases: WithArgs<
    { query: string; translationId: number; limit?: number },
    SemanticSearchResult[]
  >
  toggle_paraphrase_detection: WithArgs<{ enabled: boolean }, boolean>
  reading_mode_status: NoArgs<ReadingModeStatus>
  stop_reading_mode: NoArgs<void>
  summarize_preaching: WithArgs<
    { segments: string[]; scriptures: string[] },
    PreachingSummary
  >
  prepare_presentation_document: WithArgs<{ path: string }, ArrayBuffer>
  find_easyworship_databases: WithArgs<
    { folder: string },
    { songsDbPath: string; songWordsDbPath: string }
  >
  import_easyworship_songs: WithArgs<
    { songsDbPath: string; songWordsDbPath: string },
    {
      songs: EasyWorshipImportedSong[]
      totalSongs: number
      skippedSongs: Array<{ id: string; title: string; reason: string }>
      orphanLyricIds: number[]
      unassignedLyricRows: number
    }
  >
  get_audio_devices: NoArgs<DeviceInfo[]>
  test_deepgram_connection: WithArgs<{ apiKey: string }, ConnectionTestResult>
  test_openai_connection: WithArgs<{ apiKey: string }, ConnectionTestResult>
  test_groq_connection: WithArgs<{ apiKey: string }, ConnectionTestResult>
  list_local_speech_models: NoArgs<LocalSpeechModelStatus[]>
  download_local_speech_model: WithArgs<
    { model: LocalSpeechModel; progress: Channel<string> },
    void
  >
  list_whisper_models: NoArgs<WhisperModelStatus[]>
  download_whisper_model: WithArgs<
    { model: WhisperModel; progress: Channel<number> },
    void
  >
  start_transcription: WithArgs<
    {
      apiKey: string
      deviceId: string | null
      gain: number | null
      provider: string | null
      sermonId?: string
      whisperModel?: WhisperModel
      localSpeechModel?: LocalSpeechModel
    },
    number
  >
  stop_transcription: NoArgs<void>
  list_sermon_audio: WithArgs<
    { sermonId: string },
    Array<{ path: string; startedAt: number; durationMs: number }>
  >
  delete_sermon_audio: WithArgs<{ sermonId: string }, void>
  sermon_audio_formats: NoArgs<string[]>
  export_sermon_audio: WithArgs<
    { sermonId: string; destination: string; format: string },
    void
  >
  export_sermon_bundle: WithArgs<
    {
      sermonId: string
      destination: string
      content: { coverPng: number[]; transcript: string; summary: string }
    },
    boolean
  >
  load_secure_settings: NoArgs<SecureSettings>
  save_secure_settings: WithArgs<{ secrets: SecureSettings }, void>
  list_monitors: NoArgs<MonitorInfo[]>
  ensure_broadcast_window: WithArgs<{ outputId: string; title: string }, void>
  open_broadcast_window: WithArgs<
    { outputId: string; monitorIndex: number; title: string },
    void
  >
  close_broadcast_window: WithArgs<{ outputId: string }, void>
  /** Starts the sender and its native frame clock. App/state arguments are injected. */
  start_ndi: WithArgs<
    { outputId: string; request: NdiStartRequest },
    NdiSessionInfo
  >
  stop_ndi: WithArgs<{ outputId: string }, void>
  get_ndi_status: WithArgs<{ outputId: string }, NdiStatus | null>
  report_broadcast_diagnostic: WithArgs<
    { outputId: string; stage: string; category: string; sequence: number },
    void
  >
  push_ndi_frame: WithArgs<{ request: NdiFrameRequest }, void>
  start_osc: WithArgs<{ port?: number }, number>
  stop_osc: NoArgs<void>
  get_osc_status: NoArgs<RemoteStatus>
  start_http: WithArgs<{ port?: number }, number>
  stop_http: NoArgs<void>
  get_http_status: NoArgs<RemoteStatus>
  update_remote_status: WithArgs<
    {
      onAir?: boolean | null
      activeTheme?: string | null
      liveVerse?: string | null
      queueLength?: number | null
      confidenceThreshold?: number | null
    },
    void
  >
}

type JsonCommand = Exclude<keyof Commands, "push_ndi_frame">

export function invoke<C extends JsonCommand>(
  command: C,
  ...args: Commands[C]["args"] extends undefined ? [] : [Commands[C]["args"]]
): Promise<Commands[C]["result"]> {
  return args.length === 0
    ? tauriInvoke<Commands[C]["result"]>(command)
    : tauriInvoke<Commands[C]["result"]>(command, args[0])
}

export function sendNdiFrame(request: NdiFrameRequest): Promise<void> {
  const rgba = new Uint8Array(
    request.rgba.buffer,
    request.rgba.byteOffset,
    request.rgba.byteLength
  )
  return tauriInvoke<void>("push_ndi_frame", rgba, {
    headers: {
      "x-fellowshow-output-id": request.outputId,
      "x-fellowshow-frame-width": String(request.width),
      "x-fellowshow-frame-height": String(request.height),
    },
  })
}
