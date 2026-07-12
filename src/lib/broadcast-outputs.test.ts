import { describe, expect, it } from "vitest"
import type { VerseRenderData } from "@/types"
import {
  assignDefaultMonitorIndices,
  createDefaultOutputs,
  createOutputConfig,
  getOutputProgramPayload,
  resolveOutputThemeId,
  sanitizeOutputConfigs,
  windowLabelForOutput,
} from "./broadcast-outputs"

const scriptureVerse: VerseRenderData = {
  reference: "John 3:16",
  segments: [{ text: "For God so loved the world" }],
}

const songVerse: VerseRenderData = {
  reference: "Amazing Grace",
  segments: [{ text: "Amazing grace, how sweet the sound" }],
  referenceMode: "lyric-footer",
}

const timer = {
  remainingSeconds: 120,
  totalSeconds: 300,
  isRunning: true,
  isFinished: false,
  fontFamily: "Inter",
}

describe("windowLabelForOutput", () => {
  it("keeps the historical labels for main and alt", () => {
    expect(windowLabelForOutput("main")).toBe("broadcast")
    expect(windowLabelForOutput("alt")).toBe("broadcast-alt")
  })

  it("derives labels for added outputs", () => {
    expect(windowLabelForOutput("output-3")).toBe("broadcast-output-3")
  })
})

describe("getOutputProgramPayload", () => {
  it("carries nothing while off air", () => {
    expect(
      getOutputProgramPayload("everything", false, scriptureVerse, timer)
    ).toEqual({ verse: null, timer: null })
  })

  it("mirrors the full program on an everything output", () => {
    expect(
      getOutputProgramPayload("everything", true, songVerse, timer)
    ).toEqual({ verse: songVerse, timer })
  })

  it("shows scripture on a scripture screen", () => {
    expect(
      getOutputProgramPayload("bible", true, scriptureVerse, timer)
    ).toEqual({ verse: scriptureVerse, timer: null })
  })

  it("keeps songs off a scripture screen", () => {
    expect(getOutputProgramPayload("bible", true, songVerse, timer)).toEqual({
      verse: null,
      timer: null,
    })
  })

  it("routes song lyrics to a songs screen", () => {
    expect(getOutputProgramPayload("songs", true, songVerse, null)).toEqual({
      verse: songVerse,
      timer: null,
    })
  })

  it("shows only the timer on a timer screen", () => {
    expect(
      getOutputProgramPayload("timer", true, scriptureVerse, timer)
    ).toEqual({ verse: null, timer })
  })
})

describe("resolveOutputThemeId", () => {
  const themeState = {
    activeThemeId: "bible-theme",
    sectionThemeIds: {
      bible: "bible-theme",
      songs: "songs-theme",
      presentation: "slides-theme",
    },
  }

  it("uses the fixed theme when one is set", () => {
    expect(
      resolveOutputThemeId(
        { content: "songs", themeId: "custom" },
        themeState,
        null
      )
    ).toBe("custom")
  })

  it("follows the section theme for a dedicated screen", () => {
    expect(
      resolveOutputThemeId(
        { content: "songs", themeId: null },
        themeState,
        null
      )
    ).toBe("songs-theme")
  })

  it("follows the live content on an everything output", () => {
    expect(
      resolveOutputThemeId(
        { content: "everything", themeId: null },
        themeState,
        songVerse
      )
    ).toBe("songs-theme")
  })

  it("falls back to the given section when nothing is live", () => {
    expect(
      resolveOutputThemeId(
        { content: "everything", themeId: null },
        themeState,
        null,
        "presentation"
      )
    ).toBe("slides-theme")
  })
})

describe("createOutputConfig", () => {
  it("numbers new outputs after the existing ones", () => {
    const outputs = createDefaultOutputs()
    const added = createOutputConfig(outputs)
    expect(added.id).toBe("output-3")
    expect(added.name).toBe("Program")
    expect(added.content).toBe("everything")
  })

  it("names new outputs after their content role", () => {
    const added = createOutputConfig(createDefaultOutputs(), {
      content: "songs",
    })
    expect(added.name).toBe("Songs")
    expect(added.content).toBe("songs")
  })

  it("skips ids that are already in use", () => {
    const outputs = [
      ...createDefaultOutputs(),
      createOutputConfig(createDefaultOutputs()),
    ]
    const added = createOutputConfig(outputs)
    expect(added.id).toBe("output-4")
  })
})

describe("sanitizeOutputConfigs", () => {
  const themeIds = new Set(["known-theme"])

  it("returns null for storage that holds no outputs", () => {
    expect(sanitizeOutputConfigs(undefined, themeIds)).toBeNull()
    expect(sanitizeOutputConfigs([], themeIds)).toBeNull()
    expect(sanitizeOutputConfigs("junk", themeIds)).toBeNull()
  })

  it("keeps valid outputs and repairs bad fields", () => {
    const result = sanitizeOutputConfigs(
      [
        {
          id: "main",
          name: "Main Output",
          content: "nonsense",
          themeId: "deleted-theme",
          outputType: "display",
          monitorIndex: -2,
        },
      ],
      themeIds
    )
    expect(result).toEqual([
      {
        id: "main",
        name: "Main Output",
        content: "everything",
        themeId: null,
        outputType: "display",
        monitorIndex: null,
      },
    ])
  })

  it("restores a main output when storage lost it", () => {
    const result = sanitizeOutputConfigs(
      [
        {
          id: "output-3",
          name: "Output 3",
          content: "timer",
          themeId: "known-theme",
          outputType: "display",
          monitorIndex: 2,
        },
      ],
      themeIds
    )
    expect(result?.[0].id).toBe("main")
    expect(result?.[1]).toMatchObject({ id: "output-3", content: "timer" })
  })
})

describe("assignDefaultMonitorIndices", () => {
  const monitors = [
    { isPrimary: true },
    { isPrimary: false },
    { isPrimary: false },
    { isPrimary: false },
  ]

  it("spreads unset display outputs across free external monitors", () => {
    const assignments = assignDefaultMonitorIndices(
      [
        { id: "main", outputType: "display", monitorIndex: null },
        { id: "output-3", outputType: "display", monitorIndex: null },
        { id: "output-4", outputType: "display", monitorIndex: null },
      ],
      monitors
    )
    expect(assignments).toEqual({ main: 1, "output-3": 2, "output-4": 3 })
  })

  it("keeps valid selections and routes around them", () => {
    const assignments = assignDefaultMonitorIndices(
      [
        { id: "main", outputType: "display", monitorIndex: 2 },
        { id: "output-3", outputType: "display", monitorIndex: null },
      ],
      monitors
    )
    expect(assignments).toEqual({ "output-3": 1 })
  })

  it("reassigns selections pointing at unplugged monitors", () => {
    const assignments = assignDefaultMonitorIndices(
      [{ id: "main", outputType: "display", monitorIndex: 9 }],
      monitors
    )
    expect(assignments).toEqual({ main: 1 })
  })

  it("ignores NDI outputs", () => {
    const assignments = assignDefaultMonitorIndices(
      [{ id: "alt", outputType: "ndi", monitorIndex: null }],
      monitors
    )
    expect(assignments).toEqual({})
  })

  it("reuses the first external when outputs outnumber monitors", () => {
    const assignments = assignDefaultMonitorIndices(
      [
        { id: "main", outputType: "display", monitorIndex: null },
        { id: "output-3", outputType: "display", monitorIndex: null },
        { id: "output-4", outputType: "display", monitorIndex: null },
      ],
      [{ isPrimary: true }, { isPrimary: false }]
    )
    expect(assignments).toEqual({ main: 1, "output-3": 0, "output-4": 1 })
  })
})
