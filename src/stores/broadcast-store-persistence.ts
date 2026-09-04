import { load, type Store } from "@tauri-apps/plugin-store"
import {
  BUILTIN_THEMES,
  DEFAULT_ANNOUNCEMENT_THEME_ID,
  DEFAULT_SONG_THEME_ID,
} from "@/lib/builtin-themes"
import {
  createDefaultOutputs,
  sanitizeOutputConfigs,
} from "@/lib/broadcast-outputs"
import { parseBroadcastTheme } from "@/lib/broadcast-theme-schema"
import {
  createInactiveOverlayState,
  sanitizeOverlayConfiguration,
} from "@/lib/overlays"
import type { BroadcastTheme, BroadcastThemeSection } from "@/types"
import {
  DEFAULT_BROADCAST_THEME_ID,
  DEFAULT_SECTION_THEME_IDS,
  isSelectableTheme,
  sanitizeSectionThemeIds,
  selectOverlayOutputId,
} from "./broadcast-store-helpers"
import { useBroadcastStore } from "./broadcast-store"
import type { BroadcastState } from "./broadcast-store-types"

const BROADCAST_STORE_SCHEMA_VERSION = 1

let tauriStore: Store | null = null
let hydrationPromise: Promise<void> | null = null

async function getThemeStore(): Promise<Store> {
  if (!tauriStore) {
    tauriStore = await load("broadcast-themes.json", {
      autoSave: false,
      defaults: {},
    })
  }
  return tauriStore
}

function sanitizeThemeSortOrder(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, number] =>
        typeof entry[1] === "number" && Number.isFinite(entry[1])
    )
  )
}

export function hydrateBroadcastThemes(): Promise<void> {
  if (hydrationPromise) return hydrationPromise
  hydrationPromise = (async () => {
    try {
      const store = await getThemeStore()
      const storedSchemaVersion = await store.get<unknown>("schemaVersion")
      if (
        storedSchemaVersion !== undefined &&
        storedSchemaVersion !== null &&
        (!Number.isInteger(storedSchemaVersion) ||
          Number(storedSchemaVersion) > BROADCAST_STORE_SCHEMA_VERSION)
      ) {
        throw new Error("Unsupported broadcast store schema version")
      }
      const storedCustomThemes = await store.get<unknown>("customThemes")
      const customThemes = Array.isArray(storedCustomThemes)
        ? storedCustomThemes
            .map(parseBroadcastTheme)
            .filter((theme): theme is BroadcastTheme => theme !== null)
        : []
      const storedDeletedBuiltinThemeIds = await store.get<unknown>(
        "deletedBuiltinThemeIds"
      )
      const storedActiveId = await store.get<unknown>("activeThemeId")
      const storedAltActiveId = await store.get<unknown>("altActiveThemeId")
      const activeId =
        typeof storedActiveId === "string" ? storedActiveId : undefined
      const altActiveId =
        typeof storedAltActiveId === "string" ? storedAltActiveId : undefined
      const storedOutputs = await store.get<unknown>("outputs")
      const storedSelectedOverlayOutputId = await store.get<unknown>(
        "selectedOverlayOutputId"
      )
      const storedOverlayConfig = await store.get<unknown>("overlayConfig")
      const themeSortOrder = sanitizeThemeSortOrder(
        await store.get<unknown>("themeSortOrder")
      )
      const sectionThemeIds = sanitizeSectionThemeIds(
        await store.get<unknown>("sectionThemeIds")
      )

      const patch: Partial<BroadcastState> = {}
      const deletedBuiltinIds = Array.isArray(storedDeletedBuiltinThemeIds)
        ? storedDeletedBuiltinThemeIds.filter(
            (id): id is string =>
              typeof id === "string" && id !== DEFAULT_ANNOUNCEMENT_THEME_ID
          )
        : []
      const builtinThemes = BUILTIN_THEMES.filter(
        (theme) => !deletedBuiltinIds.includes(theme.id)
      )
      const loadedThemes =
        customThemes.length > 0
          ? [...builtinThemes, ...customThemes]
          : builtinThemes
      const selectableThemes = loadedThemes.filter(isSelectableTheme)
      const nextThemes =
        Object.keys(themeSortOrder).length > 0
          ? selectableThemes.map((theme) => ({
              ...theme,
              sortOrder:
                typeof themeSortOrder[theme.id] === "number"
                  ? themeSortOrder[theme.id]
                  : theme.sortOrder,
            }))
          : selectableThemes
      const availableThemeIds = new Set(nextThemes.map((theme) => theme.id))
      const fallbackThemeId = nextThemes[0]?.id ?? DEFAULT_BROADCAST_THEME_ID
      const resolveThemeId = (themeId: string | undefined): string =>
        themeId && availableThemeIds.has(themeId) ? themeId : fallbackThemeId
      const storedSongTheme = sectionThemeIds?.songs
        ? nextThemes.find((theme) => theme.id === sectionThemeIds.songs)
        : undefined
      const songThemeId =
        storedSongTheme?.section === "songs"
          ? storedSongTheme.id
          : DEFAULT_SONG_THEME_ID

      if (customThemes.length > 0) {
        patch.themes = nextThemes
      } else if (deletedBuiltinIds.length > 0) {
        patch.themes = nextThemes
      }
      if (deletedBuiltinIds.length > 0)
        patch.deletedBuiltinThemeIds = deletedBuiltinIds
      if (activeId) patch.activeThemeId = resolveThemeId(activeId)
      const sanitizedOutputs = sanitizeOutputConfigs(
        storedOutputs,
        availableThemeIds
      )
      if (sanitizedOutputs) {
        patch.outputs = sanitizedOutputs
      } else if (altActiveId && availableThemeIds.has(altActiveId)) {
        // Migrate the pre-routing "alternate output theme" setting.
        patch.outputs = createDefaultOutputs().map((output) =>
          output.id === "alt" ? { ...output, themeId: altActiveId } : output
        )
      }
      patch.sectionThemeIds = {
        ...DEFAULT_SECTION_THEME_IDS,
        bible: resolveThemeId(activeId ?? DEFAULT_SECTION_THEME_IDS.bible),
        ...sectionThemeIds,
        songs: resolveThemeId(songThemeId),
        announcements: resolveThemeId(DEFAULT_ANNOUNCEMENT_THEME_ID),
      }
      patch.sectionThemeIds = Object.fromEntries(
        Object.entries(patch.sectionThemeIds).map(([section, themeId]) => [
          section,
          resolveThemeId(themeId),
        ])
      ) as Record<BroadcastThemeSection, string>
      const overlayOutputs =
        patch.outputs ?? useBroadcastStore.getState().outputs
      patch.selectedOverlayOutputId = selectOverlayOutputId(
        typeof storedSelectedOverlayOutputId === "string"
          ? storedSelectedOverlayOutputId
          : null,
        overlayOutputs
      )
      patch.overlayConfig = sanitizeOverlayConfiguration(
        storedOverlayConfig,
        overlayOutputs.map((output) => output.id)
      )
      // Saved overlay content and targeting are restored, but nothing is
      // allowed to return live after an app restart.
      patch.activeOverlays = createInactiveOverlayState()
      if (Object.keys(patch).length > 0) {
        useBroadcastStore.setState(patch)
      }

      // Auto-persist on changes (debounced)
      useBroadcastStore.subscribe((state, prevState) => {
        const changed =
          state.themes !== prevState.themes ||
          state.deletedBuiltinThemeIds !== prevState.deletedBuiltinThemeIds ||
          state.activeThemeId !== prevState.activeThemeId ||
          state.outputs !== prevState.outputs ||
          state.selectedOverlayOutputId !== prevState.selectedOverlayOutputId ||
          state.sectionThemeIds !== prevState.sectionThemeIds ||
          state.overlayConfig !== prevState.overlayConfig
        if (!changed) return
        if (saveTimer) clearTimeout(saveTimer)
        saveTimer = setTimeout(() => {
          saveTimer = null
          pendingSave = pendingSave.then(() =>
            persistBroadcastThemes(useBroadcastStore.getState())
          )
        }, SAVE_DEBOUNCE_MS)
      })
    } catch {
      console.warn(
        "[broadcast] Failed to load persisted themes, using defaults"
      )
    }
  })()
  return hydrationPromise
}

let saveTimer: ReturnType<typeof setTimeout> | null = null
let pendingSave: Promise<void> = Promise.resolve()
const SAVE_DEBOUNCE_MS = 500

async function persistBroadcastThemes(state: BroadcastState): Promise<void> {
  try {
    const store = await getThemeStore()
    const customThemes = state.themes.filter(
      (theme) => !theme.builtin && isSelectableTheme(theme)
    )
    const themeSortOrder = Object.fromEntries(
      state.themes
        .filter((theme) => theme.sortOrder !== undefined)
        .map((theme) => [theme.id, theme.sortOrder])
    )
    await store.set("schemaVersion", BROADCAST_STORE_SCHEMA_VERSION)
    await store.set("customThemes", customThemes)
    await store.set("themeSortOrder", themeSortOrder)
    await store.set("deletedBuiltinThemeIds", state.deletedBuiltinThemeIds)
    await store.set("activeThemeId", state.activeThemeId)
    await store.set("outputs", state.outputs)
    await store.set("selectedOverlayOutputId", state.selectedOverlayOutputId)
    await store.set("sectionThemeIds", state.sectionThemeIds)
    await store.set("overlayConfig", state.overlayConfig)
    await store.save()
  } catch {
    console.warn("[broadcast] Failed to persist themes")
  }
}
