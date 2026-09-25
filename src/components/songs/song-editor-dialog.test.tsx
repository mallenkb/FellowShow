// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SongEditorDialog } from "./song-editor-dialog"
import { useSongEditorStore } from "@/stores/song-editor-store"
import type { CopSong } from "@/lib/cop-songs"

const saved: CopSong = {
  id: "custom-1",
  language: "english",
  languageLabel: "My songs",
  number: 0,
  title: "Quick song",
  lyrics: "1. Hallelujah to the King\n2. Praise Him all ye people",
  source: "custom",
  sourceLabel: "My songs",
}

const createCustomSong = vi.fn<
  (title: string, lyrics: string) => Promise<CopSong>
>(() => Promise.resolve(saved))
const prepareSong = vi.fn<(song: CopSong) => void>()

vi.mock("@/lib/songs-data", () => ({
  createCustomSong: (title: string, lyrics: string) =>
    createCustomSong(title, lyrics),
  updateSong: vi.fn(),
  resetSongEdits: vi.fn(),
  deleteCustomSong: vi.fn(),
  loadAllSongs: vi.fn(() => Promise.resolve([saved])),
}))
vi.mock("@/lib/song-presentation", () => ({
  prepareSong: (song: CopSong) => prepareSong(song),
}))
vi.mock("@tauri-apps/api/event", () => ({
  emitTo: vi.fn(() => Promise.resolve()),
}))

describe("SongEditorDialog", () => {
  beforeEach(() => {
    createCustomSong.mockClear()
    prepareSong.mockClear()
    useSongEditorStore.setState({ open: false, catalogVersion: 0 })
  })

  afterEach(() => {
    cleanup()
  })

  it("adds a pasted song, prepares it, and reports its slides", async () => {
    const user = userEvent.setup()
    render(<SongEditorDialog />)
    act(() => useSongEditorStore.getState().openNew("Quick song"))

    expect(screen.getByRole("textbox", { name: "Song title" })).toHaveProperty(
      "value",
      "Quick song"
    )
    await user.click(screen.getByRole("textbox", { name: "Lyrics" }))
    await user.paste("Verse 1\nHallelujah\n\nChorus\nPraise Him")
    expect(screen.getByText("2 slides: Verse 1 · Chorus")).toBeTruthy()

    await user.click(screen.getByRole("button", { name: "Add song" }))

    expect(createCustomSong).toHaveBeenCalledWith(
      "Quick song",
      "Verse 1\nHallelujah\n\nChorus\nPraise Him"
    )
    expect(prepareSong).toHaveBeenCalledWith(saved)
    expect(useSongEditorStore.getState()).toMatchObject({
      open: false,
      catalogVersion: 1,
    })
  })

  it("opens an existing song with a blank line between its slides", async () => {
    render(<SongEditorDialog />)
    act(() => useSongEditorStore.getState().openEdit(saved.id))

    expect(await screen.findByDisplayValue("Quick song")).toBeTruthy()
    const lyrics = screen.getByRole("textbox", { name: "Lyrics" })
    expect((lyrics as HTMLTextAreaElement).value).toContain("\n\n")
    expect(screen.getByRole("button", { name: "Delete song" })).toBeTruthy()
  })
})
