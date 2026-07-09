import { Fragment, useState, useEffect, useCallback, useRef } from "react"
import { invoke } from "@/lib/ipc"
import { getVersion } from "@tauri-apps/api/app"
import { openUrl } from "@tauri-apps/plugin-opener"
import type { DownloadEvent } from "@tauri-apps/plugin-updater"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Fader } from "@/components/ui/fader"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar"
import {
  MicIcon,
  TvIcon,
  KeyIcon,
  SettingsIcon,
  CheckIcon,
  BookOpenIcon,
  RadioIcon,
  HelpCircleIcon,
  GraduationCapIcon,
  BrainCircuitIcon,
  PinIcon,
  CloudIcon,
  MonitorIcon,
  XIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  RefreshCwIcon,
} from "lucide-react"
import { saveSettingsNow, useSettingsStore } from "@/stores/settings-store"
import { useBibleStore } from "@/stores/bible-store"
import { useTutorialStore } from "@/stores/tutorial-store"
import { bibleActions } from "@/hooks/use-bible"
import { useSettingsDialogStore } from "@/lib/settings-dialog"
import type { DeviceInfo } from "@/types/audio"
import { downloadAndInstallAvailableUpdate } from "@/lib/app-updater"

const FELLOW_SHOW_RELEASES_URL =
  "https://github.com/mallenkb/FellowShow/releases/latest"

/* -------------------------------------------------------------------------- */
/*  Nav definition                                                            */
/* -------------------------------------------------------------------------- */

type NavSection =
  "audio" | "speech" | "bible" | "display" | "remote" | "updates" | "help"

const navItems: { name: string; id: NavSection; icon: React.ReactNode }[] = [
  {
    name: "Audio",
    id: "audio",
    icon: <MicIcon strokeWidth={2} />,
  },
  {
    name: "Speech Recognition",
    id: "speech",
    icon: <BrainCircuitIcon strokeWidth={2} />,
  },
  {
    name: "Scriptures",
    id: "bible",
    icon: <BookOpenIcon strokeWidth={2} />,
  },
  {
    name: "Display Mode",
    id: "display",
    icon: <TvIcon strokeWidth={2} />,
  },
  {
    name: "Remote Control",
    id: "remote",
    icon: <RadioIcon strokeWidth={2} />,
  },
  {
    name: "Updates",
    id: "updates",
    icon: <RefreshCwIcon strokeWidth={2} />,
  },
  {
    name: "Help",
    id: "help",
    icon: <HelpCircleIcon strokeWidth={2} />,
  },
]

/* -------------------------------------------------------------------------- */
/*  Section: Audio                                                            */
/* -------------------------------------------------------------------------- */

function AudioSection() {
  const { audioDeviceId, setAudioDeviceId, gain, setGain } = useSettingsStore()

  const [devices, setDevices] = useState<DeviceInfo[]>([])
  const [loading, setLoading] = useState(true)

  const loadDevices = useCallback(async () => {
    try {
      setLoading(true)
      const result = await invoke("get_audio_devices")
      setDevices(result)
    } catch {
      // Tauri command may not be available during dev
      setDevices([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDevices()
  }, [loadDevices])

  // gain is 0.0-2.0 in store, display as 0-100%
  const gainPercent = Math.round((gain / 2.0) * 100)

  return (
    <div className="flex flex-col gap-6">
      {/* Device selector */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
          Input Device
        </label>
        <Select
          value={audioDeviceId ?? "__default__"}
          onValueChange={(v) =>
            setAudioDeviceId(v === "__default__" ? null : v)
          }
          disabled={loading}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue
              placeholder={loading ? "Loading devices..." : "System default"}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__default__">System default</SelectItem>
            {devices.map((device) => (
              <SelectItem key={device.id} value={device.id}>
                {device.name}
                {device.is_default ? " (default)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[0.625rem] text-muted-foreground">
          Selected device persists across sessions. Leave as system default to
          follow OS audio routing.
        </p>
      </div>

      {/* Input gain */}
      <div className="flex flex-col gap-2">
        <Fader
          label="Input Gain"
          value={gainPercent}
          min={0}
          max={100}
          step={1}
          formatValue={(v) => `${v}%`}
          onChange={(v) => setGain((v / 100) * 2.0)}
        />
        <p className="text-[0.625rem] text-muted-foreground">
          Amplifies the incoming audio signal before transcription. 50% is unity
          gain.
        </p>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Section: Speech Recognition                                               */
/* -------------------------------------------------------------------------- */

function SpeechSection() {
  const {
    sttProvider,
    setSttProvider,
    deepgramApiKey,
    setDeepgramApiKey,
    openaiApiKey,
    setOpenaiApiKey,
    groqApiKey,
    setGroqApiKey,
  } = useSettingsStore()

  const activeApiKey =
    sttProvider === "deepgram"
      ? deepgramApiKey
      : sttProvider === "openai"
        ? openaiApiKey
        : sttProvider === "groq"
          ? groqApiKey
          : null
  const [keyValue, setKeyValue] = useState(activeApiKey ?? "")
  const [saved, setSaved] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionResult, setConnectionResult] = useState<{
    ok: boolean
    message: string
  } | null>(null)

  useEffect(() => {
    setKeyValue(activeApiKey ?? "")
    setConnectionResult(null)
    setSaved(false)
  }, [activeApiKey, sttProvider])

  const handleSaveKey = async () => {
    if (sttProvider === "deepgram") setDeepgramApiKey(keyValue || null)
    if (sttProvider === "openai") setOpenaiApiKey(keyValue || null)
    if (sttProvider === "groq") setGroqApiKey(keyValue || null)
    await saveSettingsNow()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleTestConnection = async () => {
    setTestingConnection(true)
    setConnectionResult(null)
    try {
      const command =
        sttProvider === "deepgram"
          ? "test_deepgram_connection"
          : sttProvider === "openai"
            ? "test_openai_connection"
            : "test_groq_connection"
      const result = await invoke(command, {
        apiKey: keyValue,
      })
      setConnectionResult(result)
    } catch (e) {
      setConnectionResult({ ok: false, message: String(e) })
    } finally {
      setTestingConnection(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Provider selector */}
      <div className="flex flex-col gap-3">
        <label className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
          Provider
        </label>

        <RadioGroup
          value={sttProvider}
          onValueChange={(v) =>
            setSttProvider(v as "deepgram" | "openai" | "groq" | "whisper")
          }
          className="gap-3"
        >
          {/* Deepgram (cloud) */}
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors has-data-[state=checked]:border-primary/50 has-data-[state=checked]:bg-primary/5 has-data-[state=checked]:ring-1 has-data-[state=checked]:ring-primary/20 ${
              sttProvider !== "deepgram"
                ? "hover:border-muted-foreground/25"
                : ""
            }`}
          >
            <RadioGroupItem value="deepgram" className="mt-0.5" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-xs font-medium text-foreground">
                Cloud (Deepgram)
              </span>
              <p className="text-[0.625rem] leading-relaxed text-muted-foreground">
                Uses Deepgram Nova-3 for real-time streaming transcription.
                Requires an API key and internet connection. Best accuracy with
                keyword boosting for Bible terms.
              </p>
            </div>
            <CloudIcon className="mt-0.5 ml-auto size-4 shrink-0 text-muted-foreground" />
          </label>

          <label
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors has-data-[state=checked]:border-primary/50 has-data-[state=checked]:bg-primary/5 has-data-[state=checked]:ring-1 has-data-[state=checked]:ring-primary/20 ${
              sttProvider !== "openai" ? "hover:border-muted-foreground/25" : ""
            }`}
          >
            <RadioGroupItem value="openai" className="mt-0.5" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-xs font-medium text-foreground">
                Cloud (OpenAI)
              </span>
              <p className="text-[0.625rem] leading-relaxed text-muted-foreground">
                Uses OpenAI gpt-4o-mini-transcribe on short audio chunks. Good
                for accurate cloud transcription when low-latency partials are
                not required.
              </p>
            </div>
            <CloudIcon className="mt-0.5 ml-auto size-4 shrink-0 text-muted-foreground" />
          </label>

          <label
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors has-data-[state=checked]:border-primary/50 has-data-[state=checked]:bg-primary/5 has-data-[state=checked]:ring-1 has-data-[state=checked]:ring-primary/20 ${
              sttProvider !== "groq" ? "hover:border-muted-foreground/25" : ""
            }`}
          >
            <RadioGroupItem value="groq" className="mt-0.5" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-xs font-medium text-foreground">
                Cloud (Groq)
              </span>
              <p className="text-[0.625rem] leading-relaxed text-muted-foreground">
                Uses Groq whisper-large-v3-turbo on short audio chunks. Fast
                cloud transcription through Groq's OpenAI-compatible API.
              </p>
            </div>
            <CloudIcon className="mt-0.5 ml-auto size-4 shrink-0 text-muted-foreground" />
          </label>

          {/* Whisper (local) */}
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors has-data-[state=checked]:border-primary/50 has-data-[state=checked]:bg-primary/5 has-data-[state=checked]:ring-1 has-data-[state=checked]:ring-primary/20 ${
              sttProvider !== "whisper"
                ? "hover:border-muted-foreground/25"
                : ""
            }`}
          >
            <RadioGroupItem value="whisper" className="mt-0.5" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-xs font-medium text-foreground">
                Local (Whisper)
              </span>
              <p className="text-[0.625rem] leading-relaxed text-muted-foreground">
                Runs Whisper large-v3-turbo locally on your device. Fully
                offline, no API key needed. Audio never leaves your machine.
              </p>
            </div>
            <MonitorIcon className="mt-0.5 ml-auto size-4 shrink-0 text-muted-foreground" />
          </label>
        </RadioGroup>
      </div>

      {sttProvider !== "whisper" && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
              {sttProvider === "deepgram"
                ? "Deepgram"
                : sttProvider === "openai"
                  ? "OpenAI"
                  : "Groq"}{" "}
              API Key
            </label>
            {activeApiKey && (
              <Badge variant="outline" className="text-[0.5rem]">
                Key configured
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder={`Enter your ${sttProvider === "deepgram" ? "Deepgram" : sttProvider === "openai" ? "OpenAI" : "Groq"} API key...`}
              value={keyValue}
              onChange={(e) => setKeyValue(e.target.value)}
              className="flex-1 text-xs"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleTestConnection}
              disabled={testingConnection || keyValue.trim().length === 0}
            >
              {testingConnection ? "Testing..." : "Test"}
            </Button>
            <Button size="sm" onClick={handleSaveKey}>
              {saved ? (
                <>
                  <CheckIcon className="size-3" />
                  Saved
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
          <p className="text-[0.625rem] text-muted-foreground">
            Required for this cloud transcription provider.
          </p>
          {connectionResult && (
            <p
              className={`text-[0.625rem] ${
                connectionResult.ok ? "text-emerald-600" : "text-red-500"
              }`}
            >
              {connectionResult.message}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Section: Display Mode                                                     */
/* -------------------------------------------------------------------------- */

function DisplayModeSection() {
  const { autoMode, setAutoMode, confidenceThreshold, setConfidenceThreshold } =
    useSettingsStore()

  const thresholdPercent = Math.round(confidenceThreshold * 100)

  return (
    <div className="flex flex-col gap-6">
      {/* Mode selector */}
      <div className="flex flex-col gap-3">
        <label className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
          Broadcast Mode
        </label>

        <RadioGroup
          value={autoMode ? "auto" : "manual"}
          onValueChange={(v) => setAutoMode(v === "auto")}
          className="gap-3"
        >
          {/* Auto mode */}
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors has-data-[state=checked]:border-primary/50 has-data-[state=checked]:bg-primary/5 has-data-[state=checked]:ring-1 has-data-[state=checked]:ring-primary/20 ${
              !autoMode ? "hover:border-muted-foreground/25" : ""
            }`}
          >
            <RadioGroupItem value="auto" className="mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-foreground">Auto</span>
              <p className="text-[0.625rem] leading-relaxed text-muted-foreground">
                Automatically displays the highest-confidence detected verse on
                broadcast output. A 2.5-second cooldown prevents rapid
                flickering. Best for hands-off operation.
              </p>
            </div>
          </label>

          {/* Manual mode */}
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors has-data-[state=checked]:border-primary/50 has-data-[state=checked]:bg-primary/5 has-data-[state=checked]:ring-1 has-data-[state=checked]:ring-primary/20 ${
              autoMode ? "hover:border-muted-foreground/25" : ""
            }`}
          >
            <RadioGroupItem value="manual" className="mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-foreground">
                Manual
              </span>
              <p className="text-[0.625rem] leading-relaxed text-muted-foreground">
                Nothing goes to broadcast until you explicitly send it. Detected
                verses still appear in the AI Detections panel and queue, but
                you decide which ones to display and when. Best for important
                services.
              </p>
            </div>
          </label>
        </RadioGroup>
      </div>

      {/* Confidence threshold — only when auto */}
      {autoMode && (
        <div className="flex flex-col gap-2">
          <Fader
            label="Confidence Threshold"
            value={thresholdPercent}
            min={35}
            max={100}
            step={1}
            formatValue={(v) => `${v}%`}
            onChange={(v) => setConfidenceThreshold(v / 100)}
          />
          <p className="text-[0.625rem] text-muted-foreground">
            Only verses with confidence above this threshold will be sent to
            broadcast automatically. Higher values reduce false positives.
          </p>
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Section titles                                                            */
/* -------------------------------------------------------------------------- */

const sectionTitles: Record<NavSection, string> = {
  audio: "Audio",
  speech: "Speech Recognition",
  bible: "Scripture Translation",
  display: "Display Mode",
  remote: "Remote Control",
  updates: "Updates",
  help: "Help",
}

/* -------------------------------------------------------------------------- */
/*  Section: Bible Translation                                                */
/* -------------------------------------------------------------------------- */

interface TranslationInfo {
  id: number
  abbreviation: string
  title: string
  language: string
  is_downloaded: boolean
  is_copyrighted: boolean
}

function TranslationGroup({
  title,
  translations,
  activeId,
  hiddenTranslationIds,
  pinnedTranslationIds,
  onToggleHidden,
  onTogglePinned,
  onSelectTranslation,
  onDownloadTranslation,
  onCancelDownload,
  onTranslationDragStart,
  onTranslationDragOver,
  onTranslationDrop,
  onTranslationDragEnd,
  renderTranslationDropMarker,
  downloadingTranslation,
  downloadProgress,
}: {
  title: string
  translations: TranslationInfo[]
  activeId: number
  hiddenTranslationIds: number[]
  pinnedTranslationIds: number[]
  onToggleHidden: (id: number) => void
  onTogglePinned: (id: number) => void
  onSelectTranslation: (id: number) => void
  onDownloadTranslation: (translation: TranslationInfo) => void
  onCancelDownload: (abbreviation: string) => void
  onTranslationDragStart: (
    event: React.DragEvent<HTMLElement>,
    id: number
  ) => void
  onTranslationDragOver: (
    event: React.DragEvent<HTMLElement>,
    targetId: number
  ) => void
  onTranslationDrop: (
    event: React.DragEvent<HTMLElement>,
    targetId: number
  ) => void
  onTranslationDragEnd: () => void
  renderTranslationDropMarker: (
    id: number,
    edge: "before" | "after"
  ) => React.ReactNode
  downloadingTranslation: string | null
  downloadProgress: number | null
}) {
  if (translations.length === 0) return null

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-3">
        <h3 className="text-[0.65rem] font-semibold tracking-wider text-muted-foreground uppercase">
          {title}
        </h3>
      </div>
      <div className="rounded-md border border-border">
        {translations.map((t) => {
          const isRequiredPinned = t.abbreviation === "NKJV"
          const isDownloaded = t.is_downloaded
          const isPinned =
            isRequiredPinned ||
            (isDownloaded && pinnedTranslationIds.includes(t.id))
          const isHidden =
            !isRequiredPinned && hiddenTranslationIds.includes(t.id)
          const isDownloading = downloadingTranslation === t.abbreviation
          const isAnotherDownloadActive =
            downloadingTranslation !== null && !isDownloading

          return (
            <Fragment key={t.id}>
              {renderTranslationDropMarker(t.id, "before")}
              <div
                draggable={isDownloaded}
                onDragStart={(event) => {
                  if (!isDownloaded) return
                  onTranslationDragStart(event, t.id)
                }}
                onDragOver={(event) => {
                  if (!isDownloaded) return
                  onTranslationDragOver(event, t.id)
                }}
                onDrop={(event) => {
                  if (!isDownloaded) return
                  onTranslationDrop(event, t.id)
                }}
                onDragEnd={onTranslationDragEnd}
                onClick={() => {
                  if (isDownloaded) onSelectTranslation(t.id)
                }}
                className={`flex min-h-10 items-center gap-3 px-3 py-2 transition hover:bg-muted/35 ${
                  isDownloaded ? "cursor-pointer" : "cursor-default"
                }`}
              >
                <RadioGroupItem
                  value={String(t.id)}
                  id={`translation-${t.id}`}
                  disabled={!isDownloaded}
                />
                <span className="w-14 shrink-0 text-xs font-medium text-foreground">
                  {t.abbreviation}
                </span>
                <span className="min-w-0 text-xs text-muted-foreground">
                  {t.title}
                </span>
                <span
                  className="ml-auto flex shrink-0 items-center gap-2 text-[0.625rem] text-muted-foreground"
                  onClick={(event) => event.stopPropagation()}
                  onPointerDown={(event) => event.stopPropagation()}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className={
                      isPinned || isRequiredPinned
                        ? "text-primary"
                        : "text-muted-foreground"
                    }
                    onClick={() => onTogglePinned(t.id)}
                    disabled={isRequiredPinned || !isDownloaded}
                    aria-label={`${isPinned ? "Unpin" : "Pin"} ${t.abbreviation}`}
                  >
                    <PinIcon
                      className={
                        isPinned || isRequiredPinned
                          ? "size-3.5 fill-current"
                          : "size-3.5"
                      }
                    />
                  </Button>
                  {t.id === activeId && (
                    <Badge
                      variant="secondary"
                      className="shrink-0 text-[0.625rem]"
                    >
                      Default
                    </Badge>
                  )}
                  {isDownloaded ? (
                    <>
                      <span>{isHidden ? "Hidden" : "Shown"}</span>
                      <Switch
                        checked={!isHidden}
                        onCheckedChange={() => onToggleHidden(t.id)}
                        disabled={t.id === activeId || isRequiredPinned}
                        aria-label={`${isHidden ? "Show" : "Hide"} ${t.abbreviation}`}
                      />
                    </>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={`group relative h-7 min-w-28 overflow-hidden px-3 text-[0.625rem] font-semibold text-primary disabled:border-border disabled:bg-muted/40 disabled:text-muted-foreground dark:text-white ${
                        isDownloading
                          ? "hover:text-destructive-foreground border-destructive/50 bg-primary/10 hover:border-destructive hover:bg-destructive"
                          : "border-primary/45 bg-primary/10 hover:bg-primary/15 hover:text-primary dark:hover:text-white"
                      }`}
                      disabled={isAnotherDownloadActive}
                      onClick={() =>
                        isDownloading
                          ? onCancelDownload(t.abbreviation)
                          : onDownloadTranslation(t)
                      }
                    >
                      {isDownloading ? (
                        <>
                          <span
                            className="absolute inset-y-0 left-0 bg-primary/40 transition-[width] duration-150 ease-out group-hover:hidden"
                            style={{ width: `${downloadProgress ?? 5}%` }}
                            aria-hidden
                          />
                          <span className="relative tabular-nums group-hover:hidden">
                            {downloadProgress != null
                              ? `${t.abbreviation} ${downloadProgress}%`
                              : `Downloading ${t.abbreviation}`}
                          </span>
                          <span className="relative hidden group-hover:inline">
                            Cancel
                          </span>
                        </>
                      ) : (
                        "Download"
                      )}
                    </Button>
                  )}
                </span>
              </div>
              {renderTranslationDropMarker(t.id, "after")}
            </Fragment>
          )
        })}
      </div>
    </section>
  )
}

function BibleSection() {
  const [translations, setTranslations] = useState<TranslationInfo[]>([])
  const [activeId, setActiveId] = useState<number>(1)
  const [loading, setLoading] = useState(true)
  const [downloadingTranslation, setDownloadingTranslation] = useState<
    string | null
  >(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null)
  const [pinnedDropIndex, setPinnedDropIndex] = useState<number | null>(null)
  const [draggedPinnedTranslationId, setDraggedPinnedTranslationId] = useState<
    number | null
  >(null)
  const [translationDropTarget, setTranslationDropTarget] = useState<{
    id: number
    edge: "before" | "after"
  } | null>(null)
  const cancelledDownloadsRef = useRef(new Set<string>())
  const hiddenTranslationIds = useSettingsStore((s) => s.hiddenTranslationIds)
  const pinnedTranslationIds = useSettingsStore((s) => s.pinnedTranslationIds)
  const toggleHiddenTranslation = useSettingsStore(
    (s) => s.toggleHiddenTranslation
  )
  const togglePinnedTranslation = useSettingsStore(
    (s) => s.togglePinnedTranslation
  )
  const setPinnedTranslationIds = useSettingsStore(
    (s) => s.setPinnedTranslationIds
  )

  useEffect(() => {
    async function load() {
      try {
        const [trans, active] = await Promise.all([
          invoke("list_translations"),
          invoke("get_active_translation"),
        ])
        setTranslations(trans)
        setActiveId(active)
      } catch (e) {
        console.error("Failed to load translations:", e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const reloadTranslations = async () => {
    const trans = await invoke("list_translations")
    setTranslations(trans)
    useBibleStore.getState().setTranslations(trans)
    return trans
  }

  const handleChange = async (value: string) => {
    const id = parseInt(value)
    try {
      await invoke("set_active_translation", { translationId: id })
      setActiveId(id)
      // Update frontend stores so all panels use the new translation
      useBibleStore.getState().setActiveTranslation(id)
      // Refresh the book list for the newly active translation so the main
      // scripture view loads it immediately (the chapter reload is reactive).
      await bibleActions.loadBooks(id)
      if (hiddenTranslationIds.includes(id)) {
        useSettingsStore.getState().toggleHiddenTranslation(id)
      }
    } catch (e) {
      console.error("Failed to set translation:", e)
    }
  }

  const handleDownloadTranslation = async (translation: TranslationInfo) => {
    const { abbreviation } = translation
    cancelledDownloadsRef.current.delete(abbreviation)
    setDownloadingTranslation(abbreviation)
    setDownloadProgress(null)
    setDownloadError(null)
    const { listen } = await import("@tauri-apps/api/event")
    const unlisten = await listen<{
      abbreviation: string
      downloaded: number
      total: number | null
    }>("translation:download-progress", (event) => {
      if (event.payload.abbreviation !== abbreviation) return
      const { downloaded, total } = event.payload
      setDownloadProgress(
        total ? Math.min(100, Math.round((downloaded / total) * 100)) : null
      )
    })
    try {
      const downloaded = await invoke("download_translation", {
        abbreviation,
      })
      if (cancelledDownloadsRef.current.has(abbreviation)) {
        cancelledDownloadsRef.current.delete(abbreviation)
        return
      }
      setTranslations((current) =>
        current.map((translation) =>
          translation.id === downloaded.id ? downloaded : translation
        )
      )
      useBibleStore
        .getState()
        .setTranslations(
          translations.map((translation) =>
            translation.id === downloaded.id ? downloaded : translation
          )
        )
      await reloadTranslations()
      // Just install it: don't make it the active/default translation, and keep
      // it hidden until the user turns on "Shown" themselves.
      const hiddenIds = useSettingsStore.getState().hiddenTranslationIds
      if (!hiddenIds.includes(downloaded.id)) {
        useSettingsStore
          .getState()
          .setHiddenTranslationIds([...hiddenIds, downloaded.id])
      }
    } catch (e) {
      if (cancelledDownloadsRef.current.has(abbreviation)) {
        cancelledDownloadsRef.current.delete(abbreviation)
        return
      }
      console.error(`Failed to download ${abbreviation}:`, e)
      setDownloadError(e instanceof Error ? e.message : String(e))
    } finally {
      unlisten()
      setDownloadProgress(null)
      setDownloadingTranslation((current) =>
        current === abbreviation ? null : current
      )
    }
  }

  const handleCancelDownload = (abbreviation: string) => {
    cancelledDownloadsRef.current.add(abbreviation)
    setDownloadError(null)
    setDownloadProgress(null)
    setDownloadingTranslation((current) =>
      current === abbreviation ? null : current
    )
  }

  const preferredEnglishOrder = ["NKJV", "NIV", "KJV", "AMP", "NLT"]
  const englishTranslations = translations
    .filter((t) => t.language === "en")
    .sort((a, b) => {
      const aIndex = preferredEnglishOrder.indexOf(a.abbreviation)
      const bIndex = preferredEnglishOrder.indexOf(b.abbreviation)
      if (aIndex !== -1 || bIndex !== -1) {
        return (
          (aIndex === -1 ? preferredEnglishOrder.length : aIndex) -
          (bIndex === -1 ? preferredEnglishOrder.length : bIndex)
        )
      }
      return a.abbreviation.localeCompare(b.abbreviation)
    })
  const otherTranslations = translations.filter((t) => t.language !== "en")
  const activeTranslation = translations.find((t) => t.id === activeId)
  const installedTranslations = translations.filter(
    (translation) => translation.is_downloaded
  )
  const hiddenInstalledCount = hiddenTranslationIds.filter((id) =>
    installedTranslations.some((translation) => translation.id === id)
  ).length
  const nkjvTranslation = translations.find(
    (translation) =>
      translation.abbreviation === "NKJV" && translation.is_downloaded
  )
  const orderedPinnedTranslations = pinnedTranslationIds
    .map((id) => translations.find((translation) => translation.id === id))
    .filter(
      (translation): translation is TranslationInfo =>
        translation !== undefined && translation.is_downloaded
    )
  const pinnedTranslations =
    nkjvTranslation && !pinnedTranslationIds.includes(nkjvTranslation.id)
      ? [nkjvTranslation, ...orderedPinnedTranslations]
      : orderedPinnedTranslations
  const previewPinnedTranslations =
    draggedPinnedTranslationId !== null && pinnedDropIndex !== null
      ? (() => {
          const fromIndex = pinnedTranslations.findIndex(
            (translation) => translation.id === draggedPinnedTranslationId
          )
          if (fromIndex === -1) return pinnedTranslations

          const nextTranslations = [...pinnedTranslations]
          const [movedTranslation] = nextTranslations.splice(fromIndex, 1)
          const adjustedIndex =
            fromIndex < pinnedDropIndex ? pinnedDropIndex - 1 : pinnedDropIndex
          nextTranslations.splice(
            Math.min(adjustedIndex, nextTranslations.length),
            0,
            movedTranslation
          )
          return nextTranslations
        })()
      : pinnedTranslations

  const previewTranslationGroup = (groupTranslations: TranslationInfo[]) => {
    if (!translationDropTarget || draggedPinnedTranslationId === null) {
      return groupTranslations
    }

    const fromIndex = groupTranslations.findIndex(
      (translation) => translation.id === draggedPinnedTranslationId
    )
    const targetIndex = groupTranslations.findIndex(
      (translation) => translation.id === translationDropTarget.id
    )
    if (fromIndex === -1 || targetIndex === -1) return groupTranslations

    const nextTranslations = [...groupTranslations]
    const [movedTranslation] = nextTranslations.splice(fromIndex, 1)
    const targetIndexAfterRemoval = nextTranslations.findIndex(
      (translation) => translation.id === translationDropTarget.id
    )
    const insertIndex =
      targetIndexAfterRemoval === -1
        ? targetIndex
        : targetIndexAfterRemoval +
          (translationDropTarget.edge === "after" ? 1 : 0)
    nextTranslations.splice(
      Math.min(insertIndex, nextTranslations.length),
      0,
      movedTranslation
    )
    return nextTranslations
  }

  const previewEnglishTranslations =
    previewTranslationGroup(englishTranslations)
  const previewOtherTranslations = previewTranslationGroup(otherTranslations)

  const pinTranslation = (id: number, index = pinnedTranslations.length) => {
    if (hiddenTranslationIds.includes(id)) {
      toggleHiddenTranslation(id)
    }
    if (!pinnedTranslationIds.includes(id)) {
      const nextIds = pinnedTranslations.map((t) => t.id)
      nextIds.splice(Math.min(index, nextIds.length), 0, id)
      setPinnedTranslationIds(nextIds)
    }
  }

  const moveTranslationToPinnedPosition = (
    fromId: number,
    targetId: number,
    edge: "before" | "after"
  ) => {
    const targetTranslation = translations.find(
      (translation) => translation.id === targetId
    )
    if (!targetTranslation?.is_downloaded || fromId === targetId) return
    if (hiddenTranslationIds.includes(fromId)) {
      toggleHiddenTranslation(fromId)
    }

    const orderedIds = pinnedTranslations
      .map((translation) => translation.id)
      .filter((id) => id !== fromId)
    const targetIndex = orderedIds.indexOf(targetId)
    const insertIndex =
      targetIndex === -1
        ? edge === "before"
          ? 0
          : orderedIds.length
        : targetIndex + (edge === "after" ? 1 : 0)

    orderedIds.splice(Math.min(insertIndex, orderedIds.length), 0, fromId)
    setPinnedTranslationIds(orderedIds)
  }

  const handleTogglePinned = (id: number) => {
    if (pinnedTranslationIds.includes(id)) {
      togglePinnedTranslation(id)
      return
    }

    pinTranslation(id)
  }

  const handlePinnedDrop = (
    event: React.DragEvent<HTMLElement>,
    fallbackIndex = pinnedTranslations.length
  ) => {
    event.preventDefault()
    const dropIndex = pinnedDropIndex ?? fallbackIndex

    const pinnedTranslationId = event.dataTransfer.getData(
      "application/x-cop-pinned-translation-id"
    )
    if (pinnedTranslationId) {
      handlePinnedReorder(Number(pinnedTranslationId), dropIndex)
      setPinnedDropIndex(null)
      setDraggedPinnedTranslationId(null)
      return
    }

    const translationId = event.dataTransfer.getData(
      "application/x-cop-translation-id"
    )
    if (!translationId) {
      setPinnedDropIndex(null)
      return
    }

    pinTranslation(Number(translationId), dropIndex)
    setPinnedDropIndex(null)
  }

  const handlePinnedReorder = (fromId: number, toIndex: number) => {
    const orderedIds = pinnedTranslations.map((translation) => translation.id)
    const fromIndex = orderedIds.indexOf(fromId)
    if (fromIndex === -1) return

    const nextIds = [...orderedIds]
    const [movedId] = nextIds.splice(fromIndex, 1)
    const adjustedIndex = fromIndex < toIndex ? toIndex - 1 : toIndex
    nextIds.splice(Math.min(adjustedIndex, nextIds.length), 0, movedId)
    setPinnedTranslationIds(nextIds)
  }

  const updatePinnedDropIndex = (
    event: React.DragEvent<HTMLElement>,
    index: number
  ) => {
    event.preventDefault()
    const rect = event.currentTarget.getBoundingClientRect()
    const after = event.clientX > rect.left + rect.width / 2
    event.dataTransfer.dropEffect = Array.from(
      event.dataTransfer.types
    ).includes("application/x-cop-pinned-translation-id")
      ? "move"
      : "copy"
    setPinnedDropIndex(index + (after ? 1 : 0))
  }

  const handleTranslationDragStart = (
    event: React.DragEvent<HTMLElement>,
    id: number
  ) => {
    setDraggedPinnedTranslationId(id)
    event.dataTransfer.setData("application/x-cop-translation-id", String(id))
    event.dataTransfer.effectAllowed = "copyMove"
  }

  const handleTranslationDragOver = (
    event: React.DragEvent<HTMLElement>,
    targetId: number
  ) => {
    event.preventDefault()
    const rect = event.currentTarget.getBoundingClientRect()
    const edge = event.clientY > rect.top + rect.height / 2 ? "after" : "before"
    event.dataTransfer.dropEffect = Array.from(
      event.dataTransfer.types
    ).includes("application/x-cop-pinned-translation-id")
      ? "move"
      : "copy"
    setTranslationDropTarget({ id: targetId, edge })
  }

  const handleTranslationDrop = (
    event: React.DragEvent<HTMLElement>,
    targetId: number
  ) => {
    event.preventDefault()
    const edge =
      translationDropTarget?.id === targetId
        ? translationDropTarget.edge
        : "after"
    const pinnedTranslationId = event.dataTransfer.getData(
      "application/x-cop-pinned-translation-id"
    )
    const translationId =
      pinnedTranslationId ||
      event.dataTransfer.getData("application/x-cop-translation-id")
    if (translationId) {
      moveTranslationToPinnedPosition(Number(translationId), targetId, edge)
    }
    setTranslationDropTarget(null)
    setPinnedDropIndex(null)
    setDraggedPinnedTranslationId(null)
  }

  const clearTranslationDragState = () => {
    setTranslationDropTarget(null)
    setPinnedDropIndex(null)
    setDraggedPinnedTranslationId(null)
  }

  const renderTranslationDropMarker = (id: number, edge: "before" | "after") =>
    translationDropTarget?.id === id && translationDropTarget.edge === edge ? (
      <div className="px-3" aria-hidden="true">
        <div className="h-0.5 rounded-full bg-primary" />
      </div>
    ) : null

  const renderPinnedDropMarker = (index: number) =>
    pinnedDropIndex === index ? (
      <span aria-hidden="true" className="h-8 w-0.5 rounded-full bg-primary" />
    ) : null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        {loading ? (
          <p className="text-xs text-muted-foreground">
            Loading translations...
          </p>
        ) : (
          <RadioGroup
            value={String(activeId)}
            onValueChange={handleChange}
            className="space-y-5"
          >
            <div
              onDragOver={(event) => {
                event.preventDefault()
                event.dataTransfer.dropEffect = Array.from(
                  event.dataTransfer.types
                ).includes("application/x-cop-pinned-translation-id")
                  ? "move"
                  : "copy"
                if (pinnedTranslations.length === 0) {
                  setPinnedDropIndex(0)
                }
              }}
              onDragLeave={(event) => {
                const relatedTarget = event.relatedTarget
                if (
                  !(relatedTarget instanceof Node) ||
                  !event.currentTarget.contains(relatedTarget)
                ) {
                  setPinnedDropIndex(null)
                  setTranslationDropTarget(null)
                }
              }}
              onDrop={handlePinnedDrop}
              className="flex min-h-16 items-center justify-between rounded-lg border border-dashed border-border bg-muted/20 p-3 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-[0.65rem] font-semibold tracking-wider text-muted-foreground uppercase">
                  Pinned Translations
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {pinnedTranslations.length > 0 ? (
                    <>
                      {draggedPinnedTranslationId === null
                        ? renderPinnedDropMarker(0)
                        : null}
                      {previewPinnedTranslations.map((translation, index) => (
                        <Fragment key={translation.id}>
                          <button
                            type="button"
                            draggable
                            onDragStart={(event) => {
                              setDraggedPinnedTranslationId(translation.id)
                              event.dataTransfer.setData(
                                "application/x-cop-pinned-translation-id",
                                String(translation.id)
                              )
                              event.dataTransfer.effectAllowed = "move"
                            }}
                            onDragOver={(event) =>
                              updatePinnedDropIndex(event, index)
                            }
                            onDrop={(event) =>
                              handlePinnedDrop(event, index + 1)
                            }
                            onDragEnd={() => {
                              setDraggedPinnedTranslationId(null)
                              setPinnedDropIndex(null)
                              setTranslationDropTarget(null)
                            }}
                            onClick={() => {
                              if (translation.abbreviation !== "NKJV") {
                                togglePinnedTranslation(translation.id)
                              }
                            }}
                            className={`cursor-grab rounded-md border border-primary/35 bg-primary/10 px-2 py-1 text-xs font-medium text-primary transition hover:bg-primary/15 active:cursor-grabbing ${
                              draggedPinnedTranslationId === translation.id
                                ? "opacity-50"
                                : ""
                            }`}
                          >
                            {translation.abbreviation}
                          </button>
                          {draggedPinnedTranslationId === null
                            ? renderPinnedDropMarker(index + 1)
                            : null}
                        </Fragment>
                      ))}
                    </>
                  ) : activeTranslation ? (
                    <Badge variant="secondary" className="text-[0.625rem]">
                      Default: {activeTranslation.abbreviation}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      No pins yet
                    </span>
                  )}
                </div>
              </div>
              <Badge variant="outline" className="shrink-0 text-[0.625rem]">
                Drop to pin
              </Badge>
            </div>
            <TranslationGroup
              title="English Translations"
              translations={previewEnglishTranslations}
              activeId={activeId}
              hiddenTranslationIds={hiddenTranslationIds}
              pinnedTranslationIds={pinnedTranslationIds}
              onToggleHidden={toggleHiddenTranslation}
              onTogglePinned={handleTogglePinned}
              onSelectTranslation={(id) => handleChange(String(id))}
              onDownloadTranslation={handleDownloadTranslation}
              onCancelDownload={handleCancelDownload}
              onTranslationDragStart={handleTranslationDragStart}
              onTranslationDragOver={handleTranslationDragOver}
              onTranslationDrop={handleTranslationDrop}
              onTranslationDragEnd={clearTranslationDragState}
              renderTranslationDropMarker={renderTranslationDropMarker}
              downloadingTranslation={downloadingTranslation}
              downloadProgress={downloadProgress}
            />
            <TranslationGroup
              title="Other Languages"
              translations={previewOtherTranslations}
              activeId={activeId}
              hiddenTranslationIds={hiddenTranslationIds}
              pinnedTranslationIds={pinnedTranslationIds}
              onToggleHidden={toggleHiddenTranslation}
              onTogglePinned={handleTogglePinned}
              onSelectTranslation={(id) => handleChange(String(id))}
              onDownloadTranslation={handleDownloadTranslation}
              onCancelDownload={handleCancelDownload}
              onTranslationDragStart={handleTranslationDragStart}
              onTranslationDragOver={handleTranslationDragOver}
              onTranslationDrop={handleTranslationDrop}
              onTranslationDragEnd={clearTranslationDragState}
              renderTranslationDropMarker={renderTranslationDropMarker}
              downloadingTranslation={downloadingTranslation}
              downloadProgress={downloadProgress}
            />
          </RadioGroup>
        )}
        <p className="text-[0.625rem] text-muted-foreground">
          Detected verses will display in this translation.
          {installedTranslations.length > 0 &&
            ` ${installedTranslations.length - hiddenInstalledCount} shown, ${hiddenInstalledCount} hidden.`}
        </p>
        {downloadError && (
          <p className="text-[0.625rem] text-destructive">{downloadError}</p>
        )}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Section: Remote Control                                                   */
/* -------------------------------------------------------------------------- */

interface RemoteStatus {
  running: boolean
  port: number | null
}

interface CommandLogEntry {
  id: number
  timestamp: string
  source: "OSC" | "HTTP"
  command: string
}

function RemoteControlSection() {
  const [oscPort, setOscPort] = useState("8000")
  const [httpPort, setHttpPort] = useState("8080")
  const [oscStatus, setOscStatus] = useState<RemoteStatus>({
    running: false,
    port: null,
  })
  const [httpStatus, setHttpStatus] = useState<RemoteStatus>({
    running: false,
    port: null,
  })
  const [oscError, setOscError] = useState<string | null>(null)
  const [httpError, setHttpError] = useState<string | null>(null)
  const [commandLog, setCommandLog] = useState<CommandLogEntry[]>([])
  const logIdRef = useRef(0)

  // Poll statuses
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const osc = await invoke("get_osc_status")
        setOscStatus(osc)
        if (osc.running) setOscError(null)
      } catch {
        /* ignore */
      }
      try {
        const http = await invoke("get_http_status")
        setHttpStatus(http)
        if (http.running) setHttpError(null)
      } catch {
        /* ignore */
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  // Listen for remote commands to populate the log
  useEffect(() => {
    let cancelled = false
    const unlisteners: (() => void)[] = []

    async function setup() {
      const { listen } = await import("@tauri-apps/api/event")

      const remoteEvents = [
        "remote:next",
        "remote:prev",
        "remote:theme",
        "remote:opacity",
        "remote:on_air",
        "remote:show",
        "remote:hide",
        "remote:confidence",
      ]

      for (const event of remoteEvents) {
        const unlisten = await listen(event, () => {
          if (cancelled) return
          const entry: CommandLogEntry = {
            id: logIdRef.current++,
            timestamp: new Date().toLocaleTimeString(),
            source: "OSC", // We can't distinguish source at event level; default to OSC
            command: event.replace("remote:", ""),
          }
          setCommandLog((prev) => [entry, ...prev].slice(0, 50))
        })
        unlisteners.push(unlisten)
      }
    }

    setup()
    return () => {
      cancelled = true
      unlisteners.forEach((fn) => fn())
    }
  }, [])

  const handleOscToggle = async () => {
    try {
      if (oscStatus.running) {
        await invoke("stop_osc")
        setOscError(null)
      } else {
        const port = parseInt(oscPort) || 8000
        const boundPort = await invoke("start_osc", { port })
        setOscPort(String(boundPort))
        setOscError(null)
      }
    } catch (e) {
      setOscError(String(e))
    }
  }

  const handleHttpToggle = async () => {
    try {
      if (httpStatus.running) {
        await invoke("stop_http")
        setHttpError(null)
      } else {
        const port = parseInt(httpPort) || 8080
        const boundPort = await invoke("start_http", { port })
        setHttpPort(String(boundPort))
        setHttpError(null)
      }
    } catch (e) {
      setHttpError(String(e))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* OSC */}
      <div className="flex flex-col gap-3">
        <label className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
          OSC (Open Sound Control)
        </label>
        <div className="flex items-center gap-3">
          <div className="flex flex-1 items-center gap-2">
            <label className="text-xs text-muted-foreground">Port</label>
            <PortInput
              value={oscPort}
              onChange={setOscPort}
              disabled={oscStatus.running}
            />
          </div>
          <StatusDot running={oscStatus.running} />
          <Button
            size="sm"
            variant={oscStatus.running ? "destructive" : "default"}
            onClick={handleOscToggle}
            className="text-xs"
          >
            {oscStatus.running ? "Stop" : "Start"}
          </Button>
        </div>
        {oscError && <p className="text-[0.625rem] text-red-500">{oscError}</p>}
        {oscStatus.running && oscStatus.port && (
          <p className="text-[0.625rem] text-muted-foreground">
            Listening on UDP port {oscStatus.port}
          </p>
        )}
        <p className="text-[0.625rem] text-muted-foreground">
          Receives commands from hardware controllers (Stream Deck, TouchOSC,
          Companion) via OSC over UDP.
        </p>
      </div>

      {/* HTTP API */}
      <div className="flex flex-col gap-3">
        <label className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
          HTTP API
        </label>
        <div className="flex items-center gap-3">
          <div className="flex flex-1 items-center gap-2">
            <label className="text-xs text-muted-foreground">Port</label>
            <PortInput
              value={httpPort}
              onChange={setHttpPort}
              disabled={httpStatus.running}
            />
          </div>
          <StatusDot running={httpStatus.running} />
          <Button
            size="sm"
            variant={httpStatus.running ? "destructive" : "default"}
            onClick={handleHttpToggle}
            className="text-xs"
          >
            {httpStatus.running ? "Stop" : "Start"}
          </Button>
        </div>
        {httpError && (
          <p className="text-[0.625rem] text-red-500">{httpError}</p>
        )}
        {httpStatus.running && httpStatus.port && (
          <p className="text-[0.625rem] text-muted-foreground">
            Serving on http://localhost:{httpStatus.port}/api/v1/
          </p>
        )}
        <p className="text-[0.625rem] text-muted-foreground">
          REST API for status queries and control commands. Use with custom
          dashboards, automation scripts, or HTTP-capable controllers.
        </p>
      </div>

      {/* Firewall guidance */}
      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <p className="mb-1 text-[0.625rem] font-medium text-muted-foreground">
          Firewall Note
        </p>
        <p className="text-[0.625rem] leading-relaxed text-muted-foreground">
          Your OS may block incoming connections. On macOS, allow FellowShow
          through System Settings → Network → Firewall. On Windows, allow
          through Windows Security → Firewall → Allow an app.
        </p>
      </div>

      {/* Command Log */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
            Command Log
          </label>
          {commandLog.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1.5 text-[0.5rem]"
              onClick={() => setCommandLog([])}
            >
              Clear
            </Button>
          )}
        </div>
        <div className="h-32 overflow-y-auto rounded-lg border border-border bg-background p-2">
          {commandLog.length === 0 ? (
            <p className="mt-8 text-center text-[0.625rem] text-muted-foreground">
              No commands received yet
            </p>
          ) : (
            <div className="flex flex-col gap-0.5">
              {commandLog.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-2 text-[0.625rem]"
                >
                  <span className="shrink-0 text-muted-foreground tabular-nums">
                    {entry.timestamp}
                  </span>
                  <Badge variant="outline" className="h-3.5 px-1 text-[0.5rem]">
                    {entry.source}
                  </Badge>
                  <span className="font-mono text-foreground">
                    {entry.command}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Section: Updates                                                          */
/* -------------------------------------------------------------------------- */

function UpdatesSection() {
  const [currentVersion, setCurrentVersion] = useState("0.1.6")
  const [status, setStatus] = useState<
    "idle" | "checking" | "downloading" | "installing" | "installed" | "error"
  >("idle")
  const [message, setMessage] = useState(
    "Check for updates. If one is available, FellowShow will download and install it automatically."
  )
  const [latestVersion, setLatestVersion] = useState<string | null>(null)
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null)

  useEffect(() => {
    getVersion()
      .then(setCurrentVersion)
      .catch(() => {
        setCurrentVersion("0.1.6")
      })
  }, [])

  const handleCheckForUpdates = async () => {
    setStatus("checking")
    setMessage("Checking for updates...")
    setLatestVersion(null)
    setDownloadProgress(null)

    let downloadedBytes = 0
    let contentLength = 0
    const installedVersion = await downloadAndInstallAvailableUpdate(
      (event: DownloadEvent) => {
        if (event.event === "Started") {
          downloadedBytes = 0
          contentLength = event.data.contentLength ?? 0
          setStatus("downloading")
          setMessage("Update found. Downloading in the background...")
          setDownloadProgress(contentLength > 0 ? 0 : null)
          return
        }

        if (event.event === "Progress") {
          downloadedBytes += event.data.chunkLength
          if (contentLength > 0) {
            setDownloadProgress(
              Math.min(100, Math.round((downloadedBytes / contentLength) * 100))
            )
          }
          return
        }

        setStatus("installing")
        setMessage("Installing update...")
      }
    )

    if (!installedVersion) {
      setStatus("idle")
      setMessage("No updates found.")
      setDownloadProgress(null)
      return
    }

    setLatestVersion(installedVersion)
    setStatus("installed")
    setDownloadProgress(100)
    setMessage("Update installed. Restart FellowShow to finish updating.")
  }

  const handleOpenLatestRelease = () => {
    void openUrl(FELLOW_SHOW_RELEASES_URL)
  }

  const isBusy =
    status === "checking" || status === "downloading" || status === "installing"

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          Manage FellowShow app updates and release information.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <RefreshCwIcon className="size-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Current Version</p>
              <p className="text-xs text-muted-foreground">
                FellowShow {currentVersion}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-[0.625rem]">
            Installed
          </Badge>
        </div>

        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground">
                Manual update
              </p>
              <p
                className={`mt-1 text-xs leading-relaxed ${
                  status === "error"
                    ? "text-destructive"
                    : "text-muted-foreground"
                }`}
              >
                {message}
              </p>
              {latestVersion ? (
                <p className="mt-1 text-[0.625rem] text-muted-foreground">
                  Latest version: {latestVersion}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-wrap justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleOpenLatestRelease}
                className="text-xs"
              >
                Open release
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isBusy}
                onClick={handleCheckForUpdates}
                className="text-xs"
              >
                <RefreshCwIcon
                  className={`size-3.5 ${isBusy ? "animate-spin" : ""}`}
                  aria-hidden="true"
                />
                Check & update
              </Button>
            </div>
          </div>

          {downloadProgress !== null ? (
            <div className="mt-3">
              <div className="h-1.5 overflow-hidden rounded-full bg-background">
                <div
                  className="h-full rounded-full bg-primary transition-[width]"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
              <p className="mt-1 text-[0.625rem] text-muted-foreground">
                {downloadProgress}% downloaded
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Section: Help                                                             */
/* -------------------------------------------------------------------------- */

function HelpSection() {
  const closeSettings = useSettingsDialogStore((s) => s.closeSettings)

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          Resources to help you get the most out of FellowShow.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <GraduationCapIcon className="size-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Interactive Tutorial</p>
              <p className="text-xs text-muted-foreground">
                Step-by-step walkthrough of every feature
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              closeSettings()
              setTimeout(() => {
                useTutorialStore.getState().startTutorial()
              }, 300)
            }}
          >
            <GraduationCapIcon className="mr-1.5 size-3.5" />
            Restart
          </Button>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
              <KeyIcon className="size-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Keyboard Shortcuts</p>
              <p className="text-xs text-muted-foreground">
                Arrow keys navigate the tutorial, Esc to dismiss
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusDot({ running }: { running: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`size-2 rounded-full ${
          running ? "animate-pulse bg-emerald-500" : "bg-muted-foreground/30"
        }`}
      />
      <span className="text-[0.625rem] text-muted-foreground">
        {running ? "Listening" : "Stopped"}
      </span>
    </div>
  )
}

function PortInput({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  const numericValue = Number(value)
  const normalizedValue = Number.isFinite(numericValue) ? numericValue : 0
  const setPort = (nextValue: number) => {
    onChange(String(Math.min(65535, Math.max(1, nextValue))))
  }

  return (
    <div className="relative w-24">
      <Input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, ""))}
        className="h-7 pr-8 text-xs tabular-nums"
        disabled={disabled}
      />
      <div className="absolute inset-y-0 right-1 flex w-6 flex-col items-center justify-center">
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => setPort(normalizedValue + 1)}
          className="flex h-3 w-5 items-center justify-center rounded-sm text-foreground transition hover:bg-foreground/10 disabled:pointer-events-none disabled:opacity-40 dark:text-white"
          aria-label="Increase port"
        >
          <ChevronUpIcon className="size-3" aria-hidden="true" />
        </button>
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => setPort(normalizedValue - 1)}
          className="flex h-3 w-5 items-center justify-center rounded-sm text-foreground transition hover:bg-foreground/10 disabled:pointer-events-none disabled:opacity-40 dark:text-white"
          aria-label="Decrease port"
        >
          <ChevronDownIcon className="size-3" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

const sectionComponents: Record<NavSection, React.FC> = {
  audio: AudioSection,
  speech: SpeechSection,
  bible: BibleSection,
  display: DisplayModeSection,
  remote: RemoteControlSection,
  updates: UpdatesSection,
  help: HelpSection,
}

/*  Main settings page                                                        */
/* -------------------------------------------------------------------------- */

export function SettingsDialog() {
  const open = useSettingsDialogStore((s) => s.isOpen)
  const activeSection = useSettingsDialogStore((s) => s.activeSection)
  const setActiveSection = useSettingsDialogStore((s) => s.setActiveSection)
  const openSettingsFn = useSettingsDialogStore((s) => s.openSettings)
  const closeSettings = useSettingsDialogStore((s) => s.closeSettings)

  const ActiveContent = sectionComponents[activeSection]

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        data-tour="settings"
        title="Settings"
        onClick={() => openSettingsFn()}
      >
        <SettingsIcon className="size-3.5" />
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-background">
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4">
            <div className="flex items-center gap-3">
              <SettingsIcon className="size-4 text-muted-foreground" />
              <div>
                <h1 className="text-sm font-semibold text-foreground">
                  Settings
                </h1>
                <p className="text-[0.6875rem] text-muted-foreground">
                  Configure audio, scriptures, display, remote control, and API
                  keys.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Close settings"
              onClick={closeSettings}
            >
              <XIcon className="size-4" />
            </Button>
          </header>

          <SidebarProvider className="h-full min-h-0! flex-1 items-start overflow-hidden">
            <Sidebar collapsible="none" className="hidden md:flex">
              <SidebarContent className="border-r border-border pt-3">
                <SidebarGroup>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {navItems.map((item) => (
                        <SidebarMenuItem key={item.id}>
                          <SidebarMenuButton
                            isActive={item.id === activeSection}
                            onClick={() => setActiveSection(item.id)}
                          >
                            {item.icon}
                            <span>{item.name}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </SidebarContent>
            </Sidebar>

            <main className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
              <nav
                aria-label="Settings sections"
                className="flex shrink-0 [scrollbar-width:none] gap-2 overflow-x-auto border-b border-border bg-background px-3 py-2 md:hidden"
              >
                {navItems.map((item) => (
                  <Button
                    key={item.id}
                    type="button"
                    variant={item.id === activeSection ? "secondary" : "ghost"}
                    size="sm"
                    className="shrink-0"
                    onClick={() => setActiveSection(item.id)}
                  >
                    {item.icon}
                    {item.name}
                  </Button>
                ))}
              </nav>

              <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
                <h2 className="text-sm font-semibold text-foreground">
                  {sectionTitles[activeSection]}
                </h2>
              </header>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                <div className="flex min-h-full w-full flex-col p-4 md:p-6 lg:max-w-5xl">
                  <ActiveContent />
                </div>
              </div>
            </main>
          </SidebarProvider>
        </div>
      ) : null}
    </>
  )
}
