import { beforeEach, describe, expect, it, vi } from "vitest"

const emitToMock = vi.fn()

vi.mock("@tauri-apps/api/event", () => ({
  emitTo: emitToMock,
}))

describe("broadcast store sync", () => {
  beforeEach(async () => {
    emitToMock.mockReset()
    emitToMock.mockResolvedValue(undefined)
    vi.resetModules()
  })

  it("starts with live output and auto preview disabled", async () => {
    const { useBroadcastStore } = await import("./broadcast-store")

    expect(useBroadcastStore.getState().isLive).toBe(false)
    expect(useBroadcastStore.getState().autoPreviewToLive).toBe(false)
  })

  it("syncBroadcastOutput emits current theme and verse to broadcast window", async () => {
    const { useBroadcastStore } = await import("./broadcast-store")
    const theme = useBroadcastStore.getState().themes[0]
    useBroadcastStore.setState({
      activeThemeId: theme.id,
      isLive: true,
      liveVerse: {
        reference: "John 3:16",
        segments: [{ text: "For God so loved the world", verseNumber: 16 }],
      },
    })

    emitToMock.mockClear()
    useBroadcastStore.getState().syncBroadcastOutput()

    expect(emitToMock).toHaveBeenCalledTimes(2)
    expect(emitToMock).toHaveBeenCalledWith(
      "broadcast",
      "broadcast:verse-update",
      expect.objectContaining({
        theme: expect.objectContaining({ id: theme.id }),
        verse: expect.objectContaining({ reference: "John 3:16" }),
      })
    )
    expect(emitToMock).toHaveBeenCalledWith(
      "broadcast-alt",
      "broadcast:verse-update",
      expect.objectContaining({
        theme: expect.objectContaining({
          id: useBroadcastStore.getState().altActiveThemeId,
        }),
        verse: expect.objectContaining({ reference: "John 3:16" }),
      })
    )
  })

  it("emits lower thirds with the current broadcast payload", async () => {
    const { useBroadcastStore } = await import("./broadcast-store")
    const theme = useBroadcastStore.getState().themes[0]
    useBroadcastStore.setState({
      activeThemeId: theme.id,
      liveVerse: null,
      lowerThird: null,
    })

    emitToMock.mockClear()
    useBroadcastStore.getState().setLowerThird({
      visible: true,
      title: "Pastor Maya Johnson",
      subtitle: "Lead Pastor",
      label: "Speaker",
    })

    expect(emitToMock).toHaveBeenCalledTimes(2)
    expect(emitToMock).toHaveBeenCalledWith(
      "broadcast",
      "broadcast:verse-update",
      expect.objectContaining({
        lowerThird: expect.objectContaining({
          visible: true,
          title: "Pastor Maya Johnson",
          subtitle: "Lead Pastor",
          label: "Speaker",
        }),
      })
    )
    expect(emitToMock).toHaveBeenCalledWith(
      "broadcast-alt",
      "broadcast:verse-update",
      expect.objectContaining({
        lowerThird: expect.objectContaining({
          title: "Pastor Maya Johnson",
        }),
      })
    )

    emitToMock.mockClear()
    useBroadcastStore.getState().clearLowerThird()

    expect(emitToMock).toHaveBeenCalledWith(
      "broadcast",
      "broadcast:verse-update",
      expect.objectContaining({
        lowerThird: null,
      })
    )
  })

  it("clamps and emits remote output opacity", async () => {
    const { useBroadcastStore } = await import("./broadcast-store")

    emitToMock.mockClear()
    useBroadcastStore.getState().setOutputOpacity(1.5)

    expect(useBroadcastStore.getState().outputOpacity).toBe(1)
    expect(emitToMock).toHaveBeenCalledTimes(2)
    expect(emitToMock).toHaveBeenCalledWith(
      "broadcast",
      "broadcast:verse-update",
      expect.objectContaining({ opacity: 1 })
    )

    useBroadcastStore.getState().setOutputOpacity(-0.5)
    expect(useBroadcastStore.getState().outputOpacity).toBe(0)
  })

  it("copies preview output to live output and turns live on", async () => {
    const { useBroadcastStore } = await import("./broadcast-store")

    useBroadcastStore.setState({
      previewVerse: {
        reference: "Genesis 1:3",
        segments: [{ text: "Let there be light", verseNumber: 3 }],
      },
      previewTimer: {
        remainingSeconds: 9,
        totalSeconds: 30,
        isRunning: true,
        isFinished: false,
        fontFamily: "Geist Variable",
        backgroundUrl: "/timer-background.jpg",
        backgroundMediaType: "image",
      },
      isLive: false,
      liveVerse: null,
      presenterTimer: null,
    })

    useBroadcastStore.getState().takePreviewLive()

    expect(useBroadcastStore.getState().isLive).toBe(true)
    expect(useBroadcastStore.getState().liveVerse?.reference).toBe(
      "Genesis 1:3"
    )
    expect(useBroadcastStore.getState().presenterTimer?.remainingSeconds).toBe(
      9
    )
    expect(emitToMock).toHaveBeenCalledWith(
      "broadcast",
      "broadcast:verse-update",
      expect.objectContaining({
        verse: expect.objectContaining({ reference: "Genesis 1:3" }),
        timer: expect.objectContaining({ remainingSeconds: 9 }),
      })
    )
  })

  it("shows preview output on the live display and keeps live on", async () => {
    const { useBroadcastStore } = await import("./broadcast-store")

    useBroadcastStore.setState({
      previewVerse: {
        reference: "Psalm 23:1",
        segments: [{ text: "The Lord is my shepherd", verseNumber: 1 }],
      },
      previewTimer: null,
      isLive: false,
      liveVerse: null,
      presenterTimer: null,
    })

    useBroadcastStore.getState().showPreviewOnLive()

    expect(useBroadcastStore.getState().isLive).toBe(true)
    expect(useBroadcastStore.getState().liveVerse?.reference).toBe("Psalm 23:1")
    expect(emitToMock).toHaveBeenCalledWith(
      "broadcast",
      "broadcast:verse-update",
      expect.objectContaining({
        verse: expect.objectContaining({ reference: "Psalm 23:1" }),
      })
    )
  })

  it("blanks both external outputs when live is turned off", async () => {
    const { useBroadcastStore } = await import("./broadcast-store")

    useBroadcastStore.setState({
      isLive: true,
      liveVerse: {
        reference: "John 3:16",
        segments: [{ text: "For God so loved the world", verseNumber: 16 }],
      },
    })

    emitToMock.mockClear()
    useBroadcastStore.getState().setLive(false)

    // Staged content is kept so going live again restores it
    expect(useBroadcastStore.getState().liveVerse?.reference).toBe("John 3:16")
    expect(emitToMock).toHaveBeenCalledWith(
      "broadcast",
      "broadcast:verse-update",
      expect.objectContaining({ verse: null, timer: null })
    )
    expect(emitToMock).toHaveBeenCalledWith(
      "broadcast-alt",
      "broadcast:verse-update",
      expect.objectContaining({ verse: null, timer: null })
    )
  })

  it("auto preview keeps live on and does not blank output for empty selections", async () => {
    const { useBroadcastStore } = await import("./broadcast-store")

    useBroadcastStore.setState({
      autoPreviewToLive: true,
      isLive: true,
      previewVerse: {
        reference: "Psalm 23:1",
        segments: [{ text: "The Lord is my shepherd", verseNumber: 1 }],
      },
      previewTimer: null,
      liveVerse: {
        reference: "Psalm 23:1",
        segments: [{ text: "The Lord is my shepherd", verseNumber: 1 }],
      },
      presenterTimer: null,
    })

    useBroadcastStore.getState().setPreviewOutput(
      {
        reference: "Psalm 23:2",
        segments: [{ text: "He maketh me to lie down", verseNumber: 2 }],
      },
      null
    )

    expect(useBroadcastStore.getState().isLive).toBe(true)
    expect(useBroadcastStore.getState().liveVerse?.reference).toBe("Psalm 23:2")

    useBroadcastStore.getState().setPreviewOutput(null, null)

    expect(useBroadcastStore.getState().isLive).toBe(true)
    expect(useBroadcastStore.getState().liveVerse?.reference).toBe("Psalm 23:2")
  })

  it("ignores duplicate preview payloads so canvases do not restart transitions", async () => {
    const { useBroadcastStore } = await import("./broadcast-store")
    const verse = {
      reference: "Psalm 23:1",
      segments: [{ text: "The Lord is my shepherd", verseNumber: 1 }],
    }
    const timer = {
      remainingSeconds: 9,
      totalSeconds: 30,
      isRunning: true,
      isFinished: false,
      fontFamily: "Geist Variable",
      backgroundUrl: "/timer-background.jpg",
      backgroundMediaType: "image" as const,
    }
    const listener = vi.fn()
    const unsubscribe = useBroadcastStore.subscribe(listener)

    useBroadcastStore.getState().setPreviewOutput(verse, timer)
    listener.mockClear()
    emitToMock.mockClear()

    useBroadcastStore.getState().setPreviewOutput(
      {
        reference: "Psalm 23:1",
        segments: [{ text: "The Lord is my shepherd", verseNumber: 1 }],
      },
      { ...timer }
    )

    expect(listener).not.toHaveBeenCalled()
    expect(emitToMock).not.toHaveBeenCalled()
    unsubscribe()
  })

  it("uses separate bible, songs, and presentation themes", async () => {
    const { useBroadcastStore } = await import("./broadcast-store")
    const [bibleTheme, songTheme, presentationTheme] =
      useBroadcastStore.getState().themes

    useBroadcastStore.getState().setActiveTheme(bibleTheme.id, "bible")
    useBroadcastStore.getState().setActiveTheme(songTheme.id, "songs")
    useBroadcastStore
      .getState()
      .setActiveTheme(presentationTheme.id, "presentation")

    expect(Object.keys(useBroadcastStore.getState().sectionThemeIds)).toEqual([
      "bible",
      "songs",
      "presentation",
    ])
    expect(useBroadcastStore.getState().sectionThemeIds.songs).toBe(
      songTheme.id
    )
    expect(useBroadcastStore.getState().sectionThemeIds.presentation).toBe(
      presentationTheme.id
    )

    emitToMock.mockClear()
    useBroadcastStore.getState().setLiveVerse({
      reference: "",
      themeSection: "songs",
      referenceMode: "lyric-footer",
      segments: [{ text: "Song lyric" }],
    })

    expect(emitToMock).toHaveBeenCalledWith(
      "broadcast",
      "broadcast:verse-update",
      expect.objectContaining({
        theme: expect.objectContaining({ id: songTheme.id }),
      })
    )

    emitToMock.mockClear()
    useBroadcastStore.getState().setLiveVerse({
      reference: "Slide",
      themeSection: "presentation",
      segments: [],
      presentationImage: { url: "/slide.jpg", name: "Slide" },
    })

    expect(emitToMock).toHaveBeenCalledWith(
      "broadcast",
      "broadcast:verse-update",
      expect.objectContaining({
        theme: expect.objectContaining({ id: presentationTheme.id }),
      })
    )
  })

  it("renaming a built-in theme creates an editable custom copy", async () => {
    const { useBroadcastStore } = await import("./broadcast-store")
    const builtin = useBroadcastStore.getState().themes[0]

    useBroadcastStore.getState().renameTheme(builtin.id, "Sunday Service")

    const state = useBroadcastStore.getState()
    const renamed = state.themes.find(
      (theme) => theme.name === "Sunday Service"
    )

    expect(renamed).toBeTruthy()
    expect(renamed?.builtin).toBe(false)
    expect(renamed?.id).not.toBe(builtin.id)
    expect(state.activeThemeId).toBe(renamed?.id)
    expect(state.editingThemeId).toBe(renamed?.id)
  })

  it("updates draft themes through typed recipes and coalesces matching edits", async () => {
    const { useBroadcastStore } = await import("./broadcast-store")
    const theme = useBroadcastStore.getState().themes[0]
    useBroadcastStore.getState().startEditing(theme.id)

    useBroadcastStore.getState().updateDraftDeep((draft) => {
      draft.layout.backgroundWidth = 80
    }, "layout.backgroundWidth")
    useBroadcastStore.getState().updateDraftDeep((draft) => {
      draft.layout.backgroundWidth = 75
    }, "layout.backgroundWidth")

    const state = useBroadcastStore.getState()
    expect({
      width: state.draftTheme?.layout.backgroundWidth,
      historyLength: state.undoStack.length,
      isPlainData: typeof state.draftTheme?.layout === "object",
    }).toEqual({ width: 75, historyLength: 1, isPlainData: true })
  })

  it("deletes built-in themes and moves every category using it to a remaining theme", async () => {
    const { useBroadcastStore } = await import("./broadcast-store")
    const state = useBroadcastStore.getState()
    const themeToDelete = state.themes.find(
      (theme) => theme.id === "builtin-bible-verse-preview"
    )
    const fallbackTheme = state.themes.find(
      (theme) => theme.id !== themeToDelete?.id
    )

    expect(themeToDelete).toBeTruthy()
    expect(fallbackTheme).toBeTruthy()

    useBroadcastStore.setState({
      activeThemeId: themeToDelete!.id,
      altActiveThemeId: themeToDelete!.id,
      sectionThemeIds: {
        bible: themeToDelete!.id,
        songs: themeToDelete!.id,
        presentation: themeToDelete!.id,
      },
      editingThemeId: themeToDelete!.id,
      draftTheme: themeToDelete,
    })

    useBroadcastStore.getState().deleteTheme(themeToDelete!.id)

    const next = useBroadcastStore.getState()
    expect(next.themes.some((theme) => theme.id === themeToDelete!.id)).toBe(
      false
    )
    expect(next.deletedBuiltinThemeIds).toEqual([themeToDelete!.id])
    expect(next.activeThemeId).toBe(fallbackTheme!.id)
    expect(next.altActiveThemeId).toBe(fallbackTheme!.id)
    expect(next.sectionThemeIds).toEqual({
      bible: fallbackTheme!.id,
      songs: fallbackTheme!.id,
      presentation: fallbackTheme!.id,
    })
    expect(next.editingThemeId).toBeNull()
    expect(next.draftTheme).toBeNull()
  })
})
