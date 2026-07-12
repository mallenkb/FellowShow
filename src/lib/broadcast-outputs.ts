import type {
  BroadcastThemeSection,
  PresenterTimerRenderData,
  VerseRenderData,
} from "@/types"
import type { OutputType } from "@/lib/broadcast-output-control"
import { selectFreeMonitorIndex } from "@/lib/broadcast-output-control"

/**
 * What a broadcast output shows. "everything" mirrors the full program
 * (verses, songs, presentations, and the timer); the rest are dedicated
 * screens that stay on their theme background while other content is live.
 */
export type OutputContent =
  "everything" | "bible" | "songs" | "presentation" | "timer"

export interface BroadcastOutputConfig {
  id: string
  name: string
  content: OutputContent
  /** Fixed theme, or null to follow the theme of whatever content is shown. */
  themeId: string | null
  outputType: OutputType
  monitorIndex: number | null
}

export const MAX_BROADCAST_OUTPUTS = 6

export const OUTPUT_CONTENT_OPTIONS: Array<{
  value: OutputContent
  label: string
  description: string
}> = [
  {
    value: "everything",
    label: "General",
    description: "Full program — scripture, songs, presentations, timer",
  },
  { value: "bible", label: "Scripture", description: "Bible verses only" },
  { value: "songs", label: "Songs", description: "Song lyrics only" },
  {
    value: "presentation",
    label: "Presentation",
    description: "Presentation slides only",
  },
  { value: "timer", label: "Timer", description: "Presenter timer only" },
]

export function outputContentLabel(content: OutputContent): string {
  return (
    OUTPUT_CONTENT_OPTIONS.find((option) => option.value === content)?.label ??
    "General"
  )
}

/** Default display name for a content role (Program for general, else the role). */
function defaultNameForContent(content: OutputContent): string {
  if (content === "everything") return "Program"
  return outputContentLabel(content)
}

/**
 * Tauri window label for an output. "main" and "alt" keep their historical
 * labels so existing windows and NDI sessions keep working.
 */
export function windowLabelForOutput(outputId: string): string {
  if (outputId === "main") return "broadcast"
  if (outputId === "alt") return "broadcast-alt"
  return `broadcast-${outputId}`
}

export function inferThemeSection(
  verse: VerseRenderData | null
): BroadcastThemeSection {
  if (verse?.themeSection) return verse.themeSection
  if (verse?.presentationImage) return "presentation"
  if (verse?.referenceMode === "lyric-footer") return "songs"
  return "bible"
}

export interface OutputThemeState {
  activeThemeId: string
  sectionThemeIds: Record<BroadcastThemeSection, string>
}

export function getSectionThemeId(
  state: OutputThemeState,
  section: BroadcastThemeSection
): string {
  if (section === "bible") return state.activeThemeId
  return state.sectionThemeIds[section] ?? state.activeThemeId
}

/**
 * Theme an output should render with right now. Outputs with a fixed theme
 * always use it; auto outputs follow the section theme of their content
 * (or of the live program, for "everything" and "timer" screens).
 */
export function resolveOutputThemeId(
  output: Pick<BroadcastOutputConfig, "content" | "themeId">,
  state: OutputThemeState,
  liveVerse: VerseRenderData | null,
  fallbackSection: BroadcastThemeSection = "bible"
): string {
  if (output.themeId) return output.themeId
  const section =
    output.content === "everything" || output.content === "timer"
      ? liveVerse
        ? inferThemeSection(liveVerse)
        : fallbackSection
      : output.content
  return getSectionThemeId(state, section)
}

/**
 * Program content an output carries. Dedicated screens only show their
 * content type and go back to the theme background otherwise.
 */
export function getOutputProgramPayload(
  content: OutputContent,
  isLive: boolean,
  verse: VerseRenderData | null,
  timer: PresenterTimerRenderData | null
): {
  verse: VerseRenderData | null
  timer: PresenterTimerRenderData | null
} {
  if (!isLive) return { verse: null, timer: null }
  if (content === "everything") return { verse, timer }
  if (content === "timer") return { verse: null, timer }
  return {
    verse: verse && inferThemeSection(verse) === content ? verse : null,
    timer: null,
  }
}

export function createDefaultOutputs(): BroadcastOutputConfig[] {
  return [
    {
      id: "main",
      name: "Program",
      content: "everything",
      themeId: null,
      outputType: "display",
      monitorIndex: null,
    },
    {
      id: "alt",
      name: "Scripture",
      content: "bible",
      themeId: null,
      outputType: "display",
      monitorIndex: null,
    },
  ]
}

export function createOutputConfig(
  outputs: BroadcastOutputConfig[],
  options?: {
    content?: OutputContent
    name?: string
    outputType?: OutputType
  }
): BroadcastOutputConfig {
  const content = options?.content ?? "everything"
  const usedIds = new Set(outputs.map((output) => output.id))
  let n = outputs.length + 1
  while (usedIds.has(`output-${n}`)) n += 1
  return {
    id: `output-${n}`,
    name: options?.name?.trim() || defaultNameForContent(content),
    content,
    themeId: null,
    outputType: options?.outputType ?? "display",
    monitorIndex: null,
  }
}

const OUTPUT_CONTENT_VALUES: ReadonlySet<string> = new Set(
  OUTPUT_CONTENT_OPTIONS.map((option) => option.value)
)

/**
 * Validate output configs loaded from persisted storage. Returns null when
 * nothing usable was stored, so callers fall back to defaults.
 */
export function sanitizeOutputConfigs(
  raw: unknown,
  validThemeIds: ReadonlySet<string>
): BroadcastOutputConfig[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null
  const outputs: BroadcastOutputConfig[] = []
  const seenIds = new Set<string>()
  for (const entry of raw) {
    if (outputs.length >= MAX_BROADCAST_OUTPUTS) break
    if (typeof entry !== "object" || entry === null) continue
    const candidate = entry as Record<string, unknown>
    const id =
      typeof candidate.id === "string" &&
      /^[a-z0-9][a-z0-9-]*$/.test(candidate.id)
        ? candidate.id
        : null
    if (!id || seenIds.has(id)) continue
    seenIds.add(id)
    const content =
      typeof candidate.content === "string" &&
      OUTPUT_CONTENT_VALUES.has(candidate.content)
        ? (candidate.content as OutputContent)
        : "everything"
    // Migrate the pre-routing default names to the role-based ones.
    const isLegacyDefaultName =
      candidate.name === "Main Output" || candidate.name === "Alternate Output"
    outputs.push({
      id,
      name:
        typeof candidate.name === "string" &&
        candidate.name.trim().length > 0 &&
        !isLegacyDefaultName
          ? candidate.name
          : defaultNameForContent(content),
      content,
      themeId:
        typeof candidate.themeId === "string" &&
        validThemeIds.has(candidate.themeId)
          ? candidate.themeId
          : null,
      outputType: candidate.outputType === "ndi" ? "ndi" : "display",
      monitorIndex:
        typeof candidate.monitorIndex === "number" &&
        Number.isInteger(candidate.monitorIndex) &&
        candidate.monitorIndex >= 0
          ? candidate.monitorIndex
          : null,
    })
  }
  if (outputs.length === 0) return null
  if (!outputs.some((output) => output.id === "main")) {
    outputs.unshift(createDefaultOutputs()[0])
  }
  return outputs
}

/**
 * Spread display outputs across monitors: outputs keep any valid selection,
 * the rest are assigned unused monitors in order (externals first). When
 * more outputs than monitors exist, leftovers get the first external and the
 * overlap warning in the dialog takes it from there.
 */
export function assignDefaultMonitorIndices(
  outputs: Array<
    Pick<BroadcastOutputConfig, "id" | "outputType" | "monitorIndex">
  >,
  monitors: Array<{ isPrimary: boolean }>
): Record<string, number> {
  const assignments: Record<string, number> = {}
  if (monitors.length === 0) return assignments

  const isValid = (index: number | null): index is number =>
    index !== null && index >= 0 && index < monitors.length
  const taken = new Set<number>()
  for (const output of outputs) {
    if (output.outputType === "display" && isValid(output.monitorIndex)) {
      taken.add(output.monitorIndex)
    }
  }

  for (const output of outputs) {
    if (output.outputType !== "display" || isValid(output.monitorIndex)) {
      continue
    }
    const free = selectFreeMonitorIndex(monitors, taken)
    const index = free ?? selectFreeMonitorIndex(monitors, []) ?? 0
    assignments[output.id] = index
    taken.add(index)
  }
  return assignments
}
