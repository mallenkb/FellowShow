import type { CopSong } from "./cop-songs"

let cache: CopSong[] | null = null
let inflight: Promise<CopSong[]> | null = null

/**
 * Lazily load the full song catalog. The data is split into separate async
 * chunks (cop-songs.json + imported-songs.json) so it stays out of the initial
 * bundle and is fetched only when the song search is first used. Result is
 * cached, and concurrent callers share a single in-flight request.
 */
export async function loadAllSongs(): Promise<CopSong[]> {
  if (cache) return cache
  if (inflight) return inflight

  inflight = Promise.all([
    import("./cop-songs.json"),
    import("./imported-songs.json"),
  ])
    .then(([cop, imported]) => {
      cache = [
        ...(cop.default as unknown as CopSong[]),
        ...(imported.default as unknown as CopSong[]),
      ]
      return cache
    })
    .finally(() => {
      inflight = null
    })

  return inflight
}
