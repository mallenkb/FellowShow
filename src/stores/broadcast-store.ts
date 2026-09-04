import { create } from "zustand"
import { BUILTIN_THEMES } from "@/lib/builtin-themes"
import { createDefaultOutputs } from "@/lib/broadcast-outputs"
import {
  createDefaultOverlayConfiguration,
  createInactiveOverlayState,
} from "@/lib/overlays"
import { createDesignerActions } from "./broadcast-designer-actions"
import { createOutputActions } from "./broadcast-output-actions"
import { createOverlayActions } from "./broadcast-overlay-actions"
import {
  DEFAULT_BROADCAST_THEME_ID,
  DEFAULT_SECTION_THEME_IDS,
} from "./broadcast-store-helpers"
import { createThemeActions } from "./broadcast-theme-actions"
import type {
  BroadcastDataState,
  BroadcastState,
} from "./broadcast-store-types"

const initialState: BroadcastDataState = {
  themes: [...BUILTIN_THEMES],
  deletedBuiltinThemeIds: [],
  activeThemeId: DEFAULT_BROADCAST_THEME_ID,
  outputs: createDefaultOutputs(),
  sectionThemeIds: { ...DEFAULT_SECTION_THEME_IDS },
  selectedThemeSection: "bible",
  previewVerse: null,
  previewTimer: null,
  liveSource: null,
  isLive: false,
  liveVerse: null,
  presenterTimer: null,
  lowerThird: null,
  overlayConfig: createDefaultOverlayConfiguration(),
  activeOverlays: createInactiveOverlayState(),
  outputOpacity: 1,
  selectedOverlayOutputId: null,
  liveOverlayOutputIds: [],
  isDesignerOpen: false,
  editingThemeId: null,
  draftTheme: null,
  baselineTheme: null,
  isDirty: false,
  undoStack: [],
  redoStack: [],
  selectedElement: null,
}

export const useBroadcastStore = create<BroadcastState>((set, get) => ({
  ...initialState,
  ...createThemeActions(set, get),
  ...createOutputActions(set, get),
  ...createOverlayActions(set, get),
  ...createDesignerActions(set, get),
}))

export { getThemeForProgramContent } from "./broadcast-store-helpers"
