import { create } from "zustand"
import { load, type Store } from "@tauri-apps/plugin-store"
import { invoke } from "@/lib/ipc"
import {
  SECRET_SETTING_KEYS,
  type SecureSettings,
  type SecretSettingKey,
} from "@/types"

type SttProvider = "deepgram" | "openai" | "groq" | "whisper"

export type AiProvider = "openrouter" | "openai"

const DEFAULT_AI_PROVIDER: AiProvider = "openrouter"
export const DEFAULT_OPENROUTER_MODEL = "inclusionai/ling-3.0-flash:free"
export const DEFAULT_OPENAI_MODEL = "gpt-4.1-mini"

export function isAiProvider(value: unknown): value is AiProvider {
  return value === "openrouter" || value === "openai"
}

export const DEFAULT_PINNED_TRANSLATION_IDS = [6, 2]

interface SettingsState {
  secretsUnlocked: boolean
  deepgramApiKey: string | null
  openaiApiKey: string | null
  groqApiKey: string | null
  claudeApiKey: string | null
  aiProvider: AiProvider
  openRouterApiKey: string | null
  openRouterModel: string
  sermonOpenAiApiKey: string | null
  sermonOpenAiModel: string
  audioDeviceId: string | null
  gain: number
  autoMode: boolean
  autoUpdateEnabled: boolean
  confidenceThreshold: number
  cooldownMs: number
  onboardingComplete: boolean
  sttProvider: SttProvider
  hiddenTranslationIds: number[]
  pinnedTranslationIds: number[]
  defaultPinnedTranslationsApplied: boolean

  setDeepgramApiKey: (key: string | null) => void
  setOpenaiApiKey: (key: string | null) => void
  setGroqApiKey: (key: string | null) => void
  setAiProvider: (provider: AiProvider) => void
  setOpenRouterApiKey: (key: string | null) => void
  setOpenRouterModel: (model: string) => void
  setSermonOpenAiApiKey: (key: string | null) => void
  setSermonOpenAiModel: (model: string) => void
  setAudioDeviceId: (id: string | null) => void
  setGain: (gain: number) => void
  setAutoMode: (auto: boolean) => void
  setAutoUpdateEnabled: (enabled: boolean) => void
  setConfidenceThreshold: (threshold: number) => void
  setOnboardingComplete: (complete: boolean) => void
  setSttProvider: (provider: SttProvider) => void
  setHiddenTranslationIds: (ids: number[]) => void
  toggleHiddenTranslation: (id: number) => void
  setPinnedTranslationIds: (ids: number[]) => void
  togglePinnedTranslation: (id: number) => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  secretsUnlocked: false,
  deepgramApiKey: null,
  openaiApiKey: null,
  groqApiKey: null,
  claudeApiKey: null,
  aiProvider: DEFAULT_AI_PROVIDER,
  openRouterApiKey: null,
  openRouterModel: DEFAULT_OPENROUTER_MODEL,
  sermonOpenAiApiKey: null,
  sermonOpenAiModel: DEFAULT_OPENAI_MODEL,
  audioDeviceId: null,
  gain: 1.0,
  autoMode: false,
  autoUpdateEnabled: true,
  confidenceThreshold: 0.8,
  cooldownMs: 2500,
  onboardingComplete: false,
  sttProvider: "deepgram",
  hiddenTranslationIds: [],
  pinnedTranslationIds: DEFAULT_PINNED_TRANSLATION_IDS,
  defaultPinnedTranslationsApplied: false,

  setDeepgramApiKey: (deepgramApiKey) => set({ deepgramApiKey }),
  setOpenaiApiKey: (openaiApiKey) => set({ openaiApiKey }),
  setGroqApiKey: (groqApiKey) => set({ groqApiKey }),
  setAiProvider: (aiProvider) => set({ aiProvider }),
  setOpenRouterApiKey: (openRouterApiKey) => set({ openRouterApiKey }),
  setOpenRouterModel: (openRouterModel) => set({ openRouterModel }),
  setSermonOpenAiApiKey: (sermonOpenAiApiKey) => set({ sermonOpenAiApiKey }),
  setSermonOpenAiModel: (sermonOpenAiModel) => set({ sermonOpenAiModel }),
  setAudioDeviceId: (audioDeviceId) => set({ audioDeviceId }),
  setGain: (gain) => set({ gain }),
  setAutoMode: (autoMode) => set({ autoMode }),
  setAutoUpdateEnabled: (autoUpdateEnabled) => set({ autoUpdateEnabled }),
  setConfidenceThreshold: (confidenceThreshold) => set({ confidenceThreshold }),
  setOnboardingComplete: (onboardingComplete) => set({ onboardingComplete }),
  setSttProvider: (sttProvider) => set({ sttProvider }),
  setHiddenTranslationIds: (hiddenTranslationIds) =>
    set({ hiddenTranslationIds }),
  toggleHiddenTranslation: (id) =>
    set((state) => ({
      hiddenTranslationIds: state.hiddenTranslationIds.includes(id)
        ? state.hiddenTranslationIds.filter((hiddenId) => hiddenId !== id)
        : [...state.hiddenTranslationIds, id],
      pinnedTranslationIds: state.hiddenTranslationIds.includes(id)
        ? state.pinnedTranslationIds
        : state.pinnedTranslationIds.filter((pinnedId) => pinnedId !== id),
    })),
  setPinnedTranslationIds: (pinnedTranslationIds) =>
    set({ pinnedTranslationIds }),
  togglePinnedTranslation: (id) =>
    set((state) => ({
      pinnedTranslationIds: state.pinnedTranslationIds.includes(id)
        ? state.pinnedTranslationIds.filter((pinnedId) => pinnedId !== id)
        : [...state.pinnedTranslationIds, id],
    })),
}))

const PERSISTED_KEYS = [
  "aiProvider",
  "openRouterModel",
  "sermonOpenAiModel",
  "audioDeviceId",
  "gain",
  "autoMode",
  "autoUpdateEnabled",
  "confidenceThreshold",
  "cooldownMs",
  "onboardingComplete",
  "sttProvider",
  "hiddenTranslationIds",
  "pinnedTranslationIds",
  "defaultPinnedTranslationsApplied",
] as const satisfies readonly (keyof SettingsState)[]

const SETTINGS_SCHEMA_VERSION = 1
const ALL_PERSISTED_STATE_KEYS = [
  ...PERSISTED_KEYS,
  ...SECRET_SETTING_KEYS,
] as const satisfies readonly (keyof SettingsState)[]

let tauriStore: Store | null = null
let hydrationPromise: Promise<void> | null = null
let persistedSecrets: SecureSettings = {}
let secretsPromise: Promise<void> | null = null

/** Access the credential vault only after a user requests keys or a cloud feature. */
export function unlockSecureSettings(): Promise<void> {
  if (useSettingsStore.getState().secretsUnlocked) return Promise.resolve()
  if (secretsPromise) return secretsPromise
  secretsPromise = (async () => {
    await hydrateSettings()
    const store = await getStore()
    const before = useSettingsStore.getState()
    const secrets = sanitizeSecureSettings(await invoke("load_secure_settings"))
    const legacyKeys: SecretSettingKey[] = []
    let migrated = false
    for (const key of SECRET_SETTING_KEYS) {
      const legacy = normalizeSecret(await store.get<unknown>(key))
      if (!secrets[key] && legacy) {
        secrets[key] = legacy
        migrated = true
      }
      if (await store.has(key)) legacyKeys.push(key)
    }
    if (migrated) await invoke("save_secure_settings", { secrets })
    for (const key of legacyKeys) await store.delete(key)
    if (legacyKeys.length) await store.save()
    persistedSecrets = { ...secrets }
    const patch: Partial<SettingsState> = { secretsUnlocked: true }
    for (const key of SECRET_SETTING_KEYS) {
      if (useSettingsStore.getState()[key] === before[key])
        patch[key] = before[key] ?? secrets[key] ?? null
    }
    useSettingsStore.setState(patch)
  })().finally(() => {
    secretsPromise = null
  })
  return secretsPromise
}

async function getStore(): Promise<Store> {
  if (!tauriStore) {
    tauriStore = await load("settings.json", { autoSave: false, defaults: {} })
  }
  return tauriStore
}

/** Load all persisted settings into the Zustand store. Idempotent and
 *  safe against concurrent callers — the first call owns the work and
 *  subsequent callers await the same promise. */
export function hydrateSettings(): Promise<void> {
  if (hydrationPromise) return hydrationPromise
  hydrationPromise = (async () => {
    try {
      const store = await getStore()
      const storedSchemaVersion = await store.get<unknown>("schemaVersion")
      if (
        storedSchemaVersion !== undefined &&
        storedSchemaVersion !== null &&
        (!Number.isInteger(storedSchemaVersion) ||
          Number(storedSchemaVersion) > SETTINGS_SCHEMA_VERSION)
      ) {
        throw new Error("Unsupported settings schema version")
      }

      const patch = await loadValidatedSettings(store)
      let settingsStoreChanged = storedSchemaVersion !== SETTINGS_SCHEMA_VERSION
      if (!patch.defaultPinnedTranslationsApplied) {
        patch.pinnedTranslationIds = DEFAULT_PINNED_TRANSLATION_IDS
        patch.defaultPinnedTranslationsApplied = true
        await store.set("pinnedTranslationIds", DEFAULT_PINNED_TRANSLATION_IDS)
        await store.set("defaultPinnedTranslationsApplied", true)
        settingsStoreChanged = true
      }
      if (settingsStoreChanged) {
        await store.set("schemaVersion", SETTINGS_SCHEMA_VERSION)
        await store.save()
      }
      if (Object.keys(patch).length > 0) {
        useSettingsStore.setState(patch)
      }

      // Attach only after successful hydration so as not to overwrite disk with defaults.
      // Debounce writes, so a dragged slider (e.g. gain) coalesces into a single disk write.
      useSettingsStore.subscribe((state, prevState) => {
        const changed = ALL_PERSISTED_STATE_KEYS.some(
          (key) => state[key] !== prevState[key]
        )
        if (!changed) return
        if (saveTimer) clearTimeout(saveTimer)
        saveTimer = setTimeout(() => {
          saveTimer = null
          void enqueuePersistence(useSettingsStore.getState()).catch(
            (error) => {
              console.warn("[settings] Failed to persist settings", error)
            }
          )
        }, SAVE_DEBOUNCE_MS)
      })
    } catch {
      // Store access can fail transiently while an updated app is starting.
      // Allow the next caller (including transcription start) to retry instead
      // of caching an empty/default settings state for the entire app session.
      hydrationPromise = null
      console.warn("[settings] Failed to load persisted state, using defaults")
    }
  })()
  return hydrationPromise
}

export async function saveSettingsNow(): Promise<void> {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  await hydrateSettings()
  await enqueuePersistence(useSettingsStore.getState())
}

let saveTimer: ReturnType<typeof setTimeout> | null = null
let pendingSave: Promise<void> = Promise.resolve()
const SAVE_DEBOUNCE_MS = 250

async function persistAll(state: SettingsState): Promise<void> {
  const secrets = secureSettingsFromState(state)
  const store = await getStore()
  for (const key of PERSISTED_KEYS) await store.set(key, state[key])
  await store.set("schemaVersion", SETTINGS_SCHEMA_VERSION)
  await store.save()

  if (
    state.secretsUnlocked &&
    !secureSettingsEqual(secrets, persistedSecrets)
  ) {
    await invoke("save_secure_settings", { secrets })
    persistedSecrets = { ...secrets }
  }
}

function enqueuePersistence(state: SettingsState): Promise<void> {
  const operation = pendingSave.then(() => persistAll(state))
  pendingSave = operation.catch(() => undefined)
  return operation
}

async function loadValidatedSettings(
  store: Store
): Promise<Partial<SettingsState>> {
  const patch: Partial<SettingsState> = {}
  for (const key of PERSISTED_KEYS) {
    const value = await store.get<unknown>(key)
    switch (key) {
      case "aiProvider":
        if (isAiProvider(value)) patch.aiProvider = value
        break
      case "openRouterModel":
        if (isNonEmptyString(value)) patch.openRouterModel = value.trim()
        break
      case "sermonOpenAiModel":
        if (isNonEmptyString(value)) patch.sermonOpenAiModel = value.trim()
        break
      case "audioDeviceId":
        if (value === null || typeof value === "string") {
          patch.audioDeviceId = value
        }
        break
      case "gain":
        if (isFiniteNumberInRange(value, 0, 2)) patch.gain = value
        break
      case "autoMode":
        if (typeof value === "boolean") patch.autoMode = value
        break
      case "autoUpdateEnabled":
        if (typeof value === "boolean") patch.autoUpdateEnabled = value
        break
      case "confidenceThreshold":
        if (isFiniteNumberInRange(value, 0, 1)) {
          patch.confidenceThreshold = value
        }
        break
      case "cooldownMs":
        if (
          Number.isInteger(value) &&
          Number(value) >= 0 &&
          Number(value) <= 60_000
        ) {
          patch.cooldownMs = Number(value)
        }
        break
      case "onboardingComplete":
        if (typeof value === "boolean") patch.onboardingComplete = value
        break
      case "sttProvider":
        if (isSttProvider(value)) patch.sttProvider = value
        break
      case "hiddenTranslationIds":
        if (Array.isArray(value)) {
          patch.hiddenTranslationIds = sanitizeTranslationIds(value)
        }
        break
      case "pinnedTranslationIds":
        if (Array.isArray(value)) {
          patch.pinnedTranslationIds = sanitizeTranslationIds(value)
        }
        break
      case "defaultPinnedTranslationsApplied":
        if (typeof value === "boolean") {
          patch.defaultPinnedTranslationsApplied = value
        }
        break
    }
  }
  return patch
}

function isSttProvider(value: unknown): value is SttProvider {
  return (
    value === "deepgram" ||
    value === "openai" ||
    value === "groq" ||
    value === "whisper"
  )
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function isFiniteNumberInRange(
  value: unknown,
  minimum: number,
  maximum: number
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= minimum &&
    value <= maximum
  )
}

function sanitizeTranslationIds(value: unknown[]): number[] {
  return [
    ...new Set(
      value.filter(
        (item): item is number => Number.isInteger(item) && Number(item) > 0
      )
    ),
  ]
}

function normalizeSecret(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function sanitizeSecureSettings(value: unknown): SecureSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  const record = value as Record<string, unknown>
  const secrets: SecureSettings = {}
  for (const key of SECRET_SETTING_KEYS) {
    const secret = normalizeSecret(record[key])
    if (secret) secrets[key] = secret
  }
  return secrets
}

function secureSettingsFromState(state: SettingsState): SecureSettings {
  const secrets: SecureSettings = {}
  for (const key of SECRET_SETTING_KEYS) {
    const secret = normalizeSecret(state[key])
    if (secret) secrets[key] = secret
  }
  return secrets
}

function secureSettingsEqual(
  left: SecureSettings,
  right: SecureSettings
): boolean {
  return SECRET_SETTING_KEYS.every((key: SecretSettingKey) => {
    return (left[key] ?? null) === (right[key] ?? null)
  })
}
