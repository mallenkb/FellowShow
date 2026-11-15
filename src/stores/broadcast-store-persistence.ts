import { load, type Store } from "@tauri-apps/plugin-store"
import {
  BUILTIN_THEMES,
  DEEP_OCEAN_SCRIPTURE_STYLE,
  DEFAULT_ANNOUNCEMENT_THEME_ID,
  DEFAULT_SONG_THEME_ID,
} from "@/lib/builtin-themes"
import {
  createDefaultOutputs,
  sanitizeOutputConfigs,
} from "@/lib/broadcast-outputs"
import { defaultNdiOutputConfig } from "@/lib/ndi-output-config"
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

const BROADCAST_STORE_SCHEMA_VERSION = 4
/** Version 3 restyled saved scripture themes. */
const SCRIPTURE_STYLE_SCHEMA_VERSION = 3
/** Version 4 made NDI overlays transparent by default. */
const TRANSPARENT_NDI_SCHEMA_VERSION = 4

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

function applyDeepOceanScriptureStyle(theme: BroadcastTheme): BroadcastTheme {
  const style = DEEP_OCEAN_SCRIPTURE_STYLE
  return {
    ...theme,
    verseText: { ...style.verseText, color: theme.verseText.color },
    reference: { ...style.reference, color: theme.reference.color },
    verseNumbers: {
      ...theme.verseNumbers,
      fontSize: style.verseNumbers.fontSize,
      superscript: style.verseNumbers.superscript,
    },
    layout: {
      ...style.layout,
      backgroundWidth: theme.layout.backgroundWidth,
      backgroundHeight: theme.layout.backgroundHeight,
    },
  }
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
      const themeRecords: unknown[] = Array.isArray(storedCustomThemes)
        ? storedCustomThemes
        : []
      const parsedThemes = themeRecords.map(parseBroadcastTheme)
      const customThemes = parsedThemes.filter(
        (theme): theme is BroadcastTheme => theme !== null
      )
      const storedDeletedBuiltinThemeIds = await store.get<unknown>(
        "deletedBuiltinThemeIds"
      )
      const storedActiveId = await store.get<unknown>("activeThemeId")
      const storedAltActiveId = await store.get<unknown>("altActiveThemeId")
      let activeId =
        typeof storedActiveId === "string" ? storedActiveId : undefined
      const altActiveId =
        storedAltActiveId === DEFAULT_SONG_THEME_ID
          ? DEFAULT_ANNOUNCEMENT_THEME_ID
          : typeof storedAltActiveId === "string"
            ? storedAltActiveId
            : undefined
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
      const replaceScriptureSelection =
        activeId === DEFAULT_SONG_THEME_ID ||
        sectionThemeIds.bible === DEFAULT_SONG_THEME_ID
      if (replaceScriptureSelection) {
        activeId = DEFAULT_ANNOUNCEMENT_THEME_ID
        sectionThemeIds.bible = activeId
      }

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
      const availableThemeIds = new Set(
        selectableThemes.map((theme) => theme.id)
      )
      const sanitizedOutputs = sanitizeOutputConfigs(
        storedOutputs,
        availableThemeIds
      )
      // Outputs saved before transparent NDI overlays always sent an opaque
      // keyed frame. Keep that so a receiver's existing luma or chroma key
      // still works. Operators can switch Alpha to Transparent themselves.
      const keepKeyedNdi =
        sanitizedOutputs !== null &&
        Number(storedSchemaVersion ?? 0) < TRANSPARENT_NDI_SCHEMA_VERSION
      if (keepKeyedNdi) {
        for (const output of sanitizedOutputs) {
          output.ndi = {
            ...(output.ndi ?? defaultNdiOutputConfig(output.name)),
            alphaMode: "noneOpaque",
          }
        }
      }
      const scriptureThemeIds = new Set([
        activeId,
        sectionThemeIds.bible,
        altActiveId,
      ])
      const otherThemeIds = new Set([
        sectionThemeIds.songs,
        sectionThemeIds.announcements,
        sectionThemeIds.presentation,
      ])
      let replaceScriptureOutput = false
      for (const output of sanitizedOutputs ?? []) {
        if (!output.themeId) continue
        if (output.content === "bible") {
          scriptureThemeIds.add(output.themeId)
          if (output.themeId === DEFAULT_SONG_THEME_ID) {
            output.themeId = DEFAULT_ANNOUNCEMENT_THEME_ID
            replaceScriptureOutput = true
          }
        } else if (output.content !== "everything") {
          otherThemeIds.add(output.themeId)
        }
      }
      const upgradeScriptureStyle =
        Number(storedSchemaVersion ?? 0) < SCRIPTURE_STYLE_SCHEMA_VERSION
      const updatedCustomThemes = new Map<string, BroadcastTheme>()
      const styledThemes = upgradeScriptureStyle
        ? selectableThemes.map((theme) => {
            const isScripture =
              theme.section === "bible" ||
              (!theme.section &&
                (!otherThemeIds.has(theme.id) ||
                  scriptureThemeIds.has(theme.id)))
            if (theme.builtin || !isScripture) return theme
            const updated = applyDeepOceanScriptureStyle(theme)
            updatedCustomThemes.set(theme.id, updated)
            return updated
          })
        : selectableThemes
      const nextThemes =
        Object.keys(themeSortOrder).length > 0
          ? styledThemes.map((theme) => ({
              ...theme,
              sortOrder:
                typeof themeSortOrder[theme.id] === "number"
                  ? themeSortOrder[theme.id]
                  : theme.sortOrder,
            }))
          : styledThemes
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
      const storedAnnouncementTheme = nextThemes.find(
        (theme) => theme.id === sectionThemeIds?.announcements
      )
      const announcementThemeId =
        storedAnnouncementTheme?.section === "announcements"
          ? storedAnnouncementTheme.id
          : DEFAULT_ANNOUNCEMENT_THEME_ID

      if (customThemes.length > 0) {
        patch.themes = nextThemes
      } else if (deletedBuiltinIds.length > 0) {
        patch.themes = nextThemes
      }
      if (deletedBuiltinIds.length > 0)
        patch.deletedBuiltinThemeIds = deletedBuiltinIds
      if (activeId) patch.activeThemeId = resolveThemeId(activeId)
      if (sanitizedOutputs) {
        patch.outputs = sanitizedOutputs
      } else if (altActiveId && availableThemeIds.has(altActiveId)) {
        // Migrate the pre-routing "alternate output theme" setting.
        replaceScriptureOutput = storedAltActiveId === DEFAULT_SONG_THEME_ID
        patch.outputs = createDefaultOutputs().map((output) =>
          output.id === "alt" ? { ...output, themeId: altActiveId } : output
        )
      }
      patch.sectionThemeIds = {
        ...DEFAULT_SECTION_THEME_IDS,
        ...sectionThemeIds,
        bible: resolveThemeId(
          sectionThemeIds.bible ?? activeId ?? DEFAULT_SECTION_THEME_IDS.bible
        ),
        songs: resolveThemeId(songThemeId),
        announcements: resolveThemeId(announcementThemeId),
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
      if (
        updatedCustomThemes.size ||
        replaceScriptureSelection ||
        replaceScriptureOutput ||
        keepKeyedNdi
      ) {
        pendingSave = pendingSave.then(async () => {
          try {
            if (updatedCustomThemes.size) {
              const migratedThemes = themeRecords.map((entry, index) => {
                const id = parsedThemes[index]?.id
                const updated = id ? updatedCustomThemes.get(id) : undefined
                if (!updated || !entry || typeof entry !== "object")
                  return entry
                const { verseText, reference, verseNumbers, layout } = updated
                return { ...entry, verseText, reference, verseNumbers, layout }
              })
              await store.set("customThemes", migratedThemes)
            }
            if (replaceScriptureSelection) {
              await store.set("activeThemeId", patch.activeThemeId)
              await store.set("sectionThemeIds", patch.sectionThemeIds)
            }
            if (replaceScriptureOutput || keepKeyedNdi) {
              await store.set("outputs", patch.outputs)
            }
            await store.set("schemaVersion", BROADCAST_STORE_SCHEMA_VERSION)
            await store.save()
          } catch (error) {
            console.warn(
              "[broadcast] Failed to migrate saved broadcast settings",
              error
            )
          }
        })
        await pendingSave
      }
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
    await store.set("customThemes", customThemes)
    await store.set("themeSortOrder", themeSortOrder)
    await store.set("deletedBuiltinThemeIds", state.deletedBuiltinThemeIds)
    await store.set("activeThemeId", state.activeThemeId)
    await store.set("outputs", state.outputs)
    await store.set("selectedOverlayOutputId", state.selectedOverlayOutputId)
    await store.set("sectionThemeIds", state.sectionThemeIds)
    await store.set("overlayConfig", state.overlayConfig)
    await store.set("schemaVersion", BROADCAST_STORE_SCHEMA_VERSION)
    await store.save()
  } catch {
    console.warn("[broadcast] Failed to persist themes")
  }
}
