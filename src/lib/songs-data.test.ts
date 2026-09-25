// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest"
import type { CopSong } from "./cop-songs"

const stored = new Map<string, unknown>()
const save = vi.fn(() => Promise.resolve())

vi.mock("@tauri-apps/plugin-store", () => ({
  load: vi.fn(() =>
    Promise.resolve({
      get: (key: string) => Promise.resolve(stored.get(key)),
      set: (key: string, value: unknown) => {
        stored.set(key, value)
        return Promise.resolve()
      },
      save,
    })
  ),
}))

const easyWorshipSong: CopSong = {
  id: "easyworship-1",
  language: "english",
  languageLabel: "EasyWorship",
  number: 1,
  title: "Way Maker",
  lyrics: "You are here, moving in our midst",
  source: "easyworship",
  sourceLabel: "EasyWorship",
}

describe("song library storage", () => {
  beforeEach(() => {
    vi.resetModules()
    stored.clear()
    save.mockClear()
    localStorage.clear()
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
      )
    )
  })

  it("moves an older localStorage import into the app-data file", async () => {
    localStorage.setItem(
      "fellowshow.easyworship-songs.v1",
      JSON.stringify([easyWorshipSong])
    )
    const { loadAllSongs } = await import("./songs-data")

    expect(await loadAllSongs()).toEqual([easyWorshipSong])
    expect(stored.get("easyworshipSongs")).toEqual([easyWorshipSong])
    expect(save).toHaveBeenCalled()
    expect(localStorage.getItem("fellowshow.easyworship-songs.v1")).toBeNull()
  })

  it("saves a new import to the app-data file", async () => {
    const { loadAllSongs, saveEasyWorshipSongs } = await import("./songs-data")

    await saveEasyWorshipSongs([easyWorshipSong])

    expect(stored.get("easyworshipSongs")).toEqual([easyWorshipSong])
    expect(await loadAllSongs()).toEqual([easyWorshipSong])
  })

  it("adds, edits, resets, and deletes songs", async () => {
    const {
      createCustomSong,
      deleteCustomSong,
      loadAllSongs,
      resetSongEdits,
      saveEasyWorshipSongs,
      updateSong,
    } = await import("./songs-data")
    await saveEasyWorshipSongs([easyWorshipSong])

    const added = await createCustomSong("Quick song", "Verse 1\nHallelujah")
    expect((await loadAllSongs()).map((song) => song.title)).toContain(
      "Quick song"
    )

    await updateSong(easyWorshipSong, "Way Maker", "Miracle worker")
    const edited = (await loadAllSongs()).find(
      (song) => song.id === easyWorshipSong.id
    )
    expect(edited).toMatchObject({ lyrics: "Miracle worker", edited: true })

    await resetSongEdits(easyWorshipSong.id)
    expect(
      (await loadAllSongs()).find((song) => song.id === easyWorshipSong.id)
    ).toEqual(easyWorshipSong)

    await deleteCustomSong(added.id)
    expect((await loadAllSongs()).map((song) => song.id)).not.toContain(
      added.id
    )
  })
})
