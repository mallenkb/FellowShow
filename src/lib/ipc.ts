import { invoke as tauriInvoke } from "@tauri-apps/api/core"
import type {
  Book,
  CrossReference,
  DetectionResult,
  DeviceInfo,
  NdiSessionInfo,
  NdiStartRequest,
  SemanticSearchResult,
  Translation,
  Verse,
} from "@/types"
import type { NdiFrameRequest } from "@/types/ndi"

interface ConnectionTestResult {
  ok: boolean
  message: string
}

interface EasyWorshipImportedSong {
  id: string
  title: string
  lyrics: string
}

export interface VerseSearchRow {
  book_number: number
  book_name: string
  chapter: number
  verse: number
  text: string
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
  list_translations: NoArgs<Translation[]>
  download_translation: WithArgs<{ abbreviation: string }, Translation>
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
  get_translation_verses_for_search: WithArgs<
    { translationId: number },
    VerseSearchRow[]
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
    { query: string; limit?: number },
    SemanticSearchResult[]
  >
  toggle_paraphrase_detection: WithArgs<{ enabled: boolean }, boolean>
  reading_mode_status: NoArgs<ReadingModeStatus>
  stop_reading_mode: NoArgs<void>
  import_easyworship_songs: WithArgs<
    { songsDbPath: string; songWordsDbPath: string },
    EasyWorshipImportedSong[]
  >
  get_audio_devices: NoArgs<DeviceInfo[]>
  test_deepgram_connection: WithArgs<{ apiKey: string }, ConnectionTestResult>
  test_openai_connection: WithArgs<{ apiKey: string }, ConnectionTestResult>
  test_groq_connection: WithArgs<{ apiKey: string }, ConnectionTestResult>
  start_transcription: WithArgs<
    {
      apiKey: string
      deviceId: string | null
      gain: number | null
      provider: string | null
    },
    void
  >
  stop_transcription: NoArgs<void>
  list_monitors: NoArgs<MonitorInfo[]>
  ensure_broadcast_window: WithArgs<{ outputId: string }, void>
  open_broadcast_window: WithArgs<
    { outputId: string; monitorIndex: number },
    void
  >
  close_broadcast_window: WithArgs<{ outputId: string }, void>
  start_ndi: WithArgs<
    { outputId: string; request: NdiStartRequest },
    NdiSessionInfo
  >
  stop_ndi: WithArgs<{ outputId: string }, void>
  get_ndi_status: WithArgs<{ outputId: string }, NdiStatus | null>
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

export function invoke<C extends keyof Commands>(
  command: C,
  ...args: Commands[C]["args"] extends undefined ? [] : [Commands[C]["args"]]
): Promise<Commands[C]["result"]> {
  return args.length === 0
    ? tauriInvoke<Commands[C]["result"]>(command)
    : tauriInvoke<Commands[C]["result"]>(command, args[0])
}
