import { create } from "zustand"

// Per-operator song playback preferences, kept on this device.
const KEY = "fellowshow-song-play-v1"

interface SongPlayPreferences {
  followLive: boolean
  repeatChorusSongIds: string[]
}

const defaults: SongPlayPreferences = {
  followLive: true,
  repeatChorusSongIds: [],
}

function readPreferences(): SongPlayPreferences {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? "null")
    if (!value || typeof value !== "object") return defaults
    const record = value as Record<string, unknown>
    if (record.version !== 1) return defaults
    return {
      followLive:
        typeof record.followLive === "boolean" ? record.followLive : true,
      repeatChorusSongIds: Array.isArray(record.repeatChorusSongIds)
        ? record.repeatChorusSongIds
            .filter((id): id is string => typeof id === "string")
            .slice(0, 500)
        : [],
    }
  } catch {
    return defaults
  }
}

export const useSongPlayStore = create<
  SongPlayPreferences & {
    setFollowLive: (followLive: boolean) => void
    toggleRepeatChorus: (songId: string) => void
  }
>((set) => ({
  ...readPreferences(),
  setFollowLive: (followLive) => set({ followLive }),
  toggleRepeatChorus: (songId) =>
    set((state) => ({
      repeatChorusSongIds: state.repeatChorusSongIds.includes(songId)
        ? state.repeatChorusSongIds.filter((id) => id !== songId)
        : [...state.repeatChorusSongIds, songId],
    })),
}))

useSongPlayStore.subscribe(({ followLive, repeatChorusSongIds }) => {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ version: 1, followLive, repeatChorusSongIds })
    )
  } catch {
    // Preferences are a convenience; the panel works without saving them.
  }
})
