import type { StateCreator } from "zustand"
import type { OutputType } from "@/lib/broadcast-output-control"
import type {
  BroadcastOutputConfig,
  OutputContent,
} from "@/lib/broadcast-outputs"
import type {
  ActiveOverlayState,
  BroadcastTheme,
  BroadcastThemeSection,
  LogoOverlayConfig,
  LowerThirdAppearanceSettings,
  LowerThirdRenderData,
  LowerThirdPreset,
  OverlayConfiguration,
  PresenterTimerRenderData,
  TickerMessage,
  TickerOverlayConfig,
  VerseRenderData,
} from "@/types"

type SelectedElement = "verse" | "reference" | null

export interface BroadcastState {
  liveSource: "manual" | "preview" | null
  themes: BroadcastTheme[]
  deletedBuiltinThemeIds: string[]
  activeThemeId: string
  outputs: BroadcastOutputConfig[]
  sectionThemeIds: Record<BroadcastThemeSection, string>
  selectedThemeSection: BroadcastThemeSection
  previewVerse: VerseRenderData | null
  previewTimer: PresenterTimerRenderData | null
  isLive: boolean
  liveVerse: VerseRenderData | null
  presenterTimer: PresenterTimerRenderData | null
  lowerThird: LowerThirdRenderData | null
  overlayConfig: OverlayConfiguration
  activeOverlays: ActiveOverlayState
  outputOpacity: number
  selectedOverlayOutputId: string | null
  /** Video Overlays outputs explicitly sent live from the overlay workflow. */
  liveOverlayOutputIds: string[]

  // Designer state
  isDesignerOpen: boolean
  editingThemeId: string | null
  draftTheme: BroadcastTheme | null
  baselineTheme: BroadcastTheme | null
  isDirty: boolean
  undoStack: BroadcastTheme[]
  redoStack: BroadcastTheme[]
  selectedElement: SelectedElement

  // Theme management
  loadThemes: () => void
  saveTheme: (theme: BroadcastTheme) => void
  deleteTheme: (id: string) => void
  duplicateTheme: (id: string) => void
  createNewTheme: () => void
  renameTheme: (id: string, name: string) => void
  togglePinTheme: (id: string) => void
  reorderThemes: (orderedIds: string[]) => void
  setActiveTheme: (id: string, section?: BroadcastThemeSection) => void
  setSelectedThemeSection: (section: BroadcastThemeSection) => void
  addOutput: (options?: {
    content?: OutputContent
    name?: string
    outputType?: OutputType
  }) => BroadcastOutputConfig | null
  removeOutput: (id: string) => void
  reorderOutputs: (orderedIds: string[]) => void
  updateOutput: (
    id: string,
    updates: Partial<Omit<BroadcastOutputConfig, "id">>
  ) => void
  setPreviewOutput: (
    verse: VerseRenderData | null,
    timer: PresenterTimerRenderData | null
  ) => void
  setLive: (live: boolean) => void
  presentOnLive: (
    verse: VerseRenderData | null,
    timer: PresenterTimerRenderData | null,
    source?: "manual" | "preview"
  ) => void
  showPreviewOnLive: (source?: "manual" | "preview") => void
  takePreviewLive: (source?: "manual" | "preview") => void
  setOverlayOutputLive: (outputId: string, live: boolean) => void
  setLiveVerse: (verse: VerseRenderData | null) => void
  setPresenterTimer: (timer: PresenterTimerRenderData | null) => void
  setLowerThird: (lowerThird: LowerThirdRenderData | null) => void
  setOutputOpacity: (opacity: number) => void
  clearLowerThird: () => void
  addLogoOverlays: (logos: LogoOverlayConfig["logos"]) => void
  updateLogoOverlay: (
    id: string,
    updates: Partial<Omit<LogoOverlayConfig["logos"][number], "id">>
  ) => void
  removeLogoOverlay: (id: string) => void
  updateTickerOverlay: (updates: Partial<TickerOverlayConfig>) => void
  setLogoOverlayVisible: (visible: boolean) => void
  saveTickerMessage: (
    message: Omit<
      TickerMessage,
      "id" | "createdAt" | "updatedAt" | "targetOutputIds"
    > & {
      id?: string
      targetOutputIds?: string[]
    }
  ) => string
  deleteTickerMessage: (id: string) => void
  showTickerMessage: (id: string) => void
  stopTickerMessage: () => void
  saveLowerThirdPreset: (
    preset: Omit<
      LowerThirdPreset,
      "id" | "createdAt" | "updatedAt" | "targetOutputIds"
    > & {
      id?: string
      targetOutputIds?: string[]
    }
  ) => string
  saveLowerThirdAppearance: (appearance: LowerThirdAppearanceSettings) => void
  deleteLowerThirdPreset: (id: string) => void
  showLowerThirdOverlay: (id: string) => void
  clearLowerThirdOverlay: () => void
  syncBroadcastOutput: () => void
  syncBroadcastOutputFor: (outputId: string) => void
  setSelectedOverlayOutputId: (outputId: string | null) => void

  // Designer actions
  setDesignerOpen: (open: boolean) => void
  startEditing: (themeId: string) => void
  updateDraft: (updates: Partial<BroadcastTheme>) => void
  updateDraftDeep: (
    recipe: (draft: BroadcastTheme) => void,
    coalesceKey: string
  ) => void
  saveDraft: () => void
  discardDraft: () => void
  undo: () => void
  redo: () => void
  setSelectedElement: (el: SelectedElement) => void
}

type ThemeActionKeys =
  | "loadThemes"
  | "saveTheme"
  | "deleteTheme"
  | "duplicateTheme"
  | "createNewTheme"
  | "renameTheme"
  | "togglePinTheme"
  | "reorderThemes"

type OutputActionKeys =
  | "syncBroadcastOutputFor"
  | "syncBroadcastOutput"
  | "setActiveTheme"
  | "setSelectedThemeSection"
  | "addOutput"
  | "removeOutput"
  | "reorderOutputs"
  | "updateOutput"
  | "setPreviewOutput"
  | "setLive"
  | "presentOnLive"
  | "showPreviewOnLive"
  | "takePreviewLive"
  | "setOverlayOutputLive"
  | "setLiveVerse"
  | "setPresenterTimer"
  | "setLowerThird"
  | "setOutputOpacity"
  | "clearLowerThird"
  | "setSelectedOverlayOutputId"

type OverlayActionKeys =
  | "addLogoOverlays"
  | "updateLogoOverlay"
  | "removeLogoOverlay"
  | "updateTickerOverlay"
  | "setLogoOverlayVisible"
  | "saveTickerMessage"
  | "deleteTickerMessage"
  | "showTickerMessage"
  | "stopTickerMessage"
  | "saveLowerThirdPreset"
  | "saveLowerThirdAppearance"
  | "deleteLowerThirdPreset"
  | "showLowerThirdOverlay"
  | "clearLowerThirdOverlay"

type DesignerActionKeys =
  | "setDesignerOpen"
  | "startEditing"
  | "updateDraft"
  | "updateDraftDeep"
  | "saveDraft"
  | "discardDraft"
  | "undo"
  | "redo"
  | "setSelectedElement"

type BroadcastActionKeys =
  ThemeActionKeys | OutputActionKeys | OverlayActionKeys | DesignerActionKeys

export type BroadcastDataState = Omit<BroadcastState, BroadcastActionKeys>
export type ThemeActions = Pick<BroadcastState, ThemeActionKeys>
export type OutputActions = Pick<BroadcastState, OutputActionKeys>
export type OverlayActions = Pick<BroadcastState, OverlayActionKeys>
export type DesignerActions = Pick<BroadcastState, DesignerActionKeys>
export type BroadcastSet = Parameters<StateCreator<BroadcastState>>[0]
export type BroadcastGet = Parameters<StateCreator<BroadcastState>>[1]
