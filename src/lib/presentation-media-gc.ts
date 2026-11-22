import { isTauri } from "@tauri-apps/api/core"
import { appDataDir, join } from "@tauri-apps/api/path"
import { getAllWindows } from "@tauri-apps/api/window"
import {
  exists,
  lstat,
  readDir,
  readTextFile,
  remove,
} from "@tauri-apps/plugin-fs"
import { useAnnouncementStore } from "@/stores/announcement-store"
import { useBroadcastStore } from "@/stores/broadcast-store"
import {
  cacheFileName,
  isSessionImport,
  visitMediaReferences,
} from "./presentation-media-cache"
import { waitForStartup } from "./startup-ready"

const gracePeriod = 10 * 60 * 1000
const storeFiles = [
  "presentation-documents.json",
  "broadcast-themes.json",
  "announcements.json",
]

function referenceOwners(getPresentation: () => object) {
  return [
    getPresentation(),
    useBroadcastStore.getState(),
    useAnnouncementStore.getState(),
  ] as const
}

export async function collectPresentationMedia(getPresentation: () => object) {
  await waitForStartup()
  const appData = await appDataDir()
  const directory = await join(appData, "media")
  if (!(await exists(directory))) return
  const root = await lstat(directory)
  if (!root.isDirectory || root.isSymlink) return
  const entries = (await readDir(directory)).filter(
    (entry) =>
      entry.isFile && !entry.isSymlink && cacheFileName.test(entry.name)
  )
  if (!entries.length) return

  const owners = referenceOwners(getPresentation)
  const referenced = new Set<string>()
  const mark = (id: string) => referenced.add(id)
  visitMediaReferences(owners, mark)
  const isReferenced = (name: string) =>
    referenced.has(name.slice(0, 36).toLowerCase())
  const candidates = entries.filter(
    ({ name }) => !isSessionImport(name) && !isReferenced(name)
  )
  if (!candidates.length) return

  // Read the actual saved records. A pending/failed save or a hydration
  // sanitizer can leave references on disk that the current stores lack.
  for (const file of storeFiles) {
    const path = await join(appData, file)
    if (await exists(path)) {
      const saved: unknown = JSON.parse(await readTextFile(path))
      if (!saved || typeof saved !== "object" || Array.isArray(saved))
        throw new Error(`Cannot inspect media references in ${file}`)
      visitMediaReferences(saved, mark)
    }
  }

  const cutoff = Date.now() - gracePeriod
  let retry = false
  // A projector can retain its last payload across an operator reload.
  if (
    candidates.some(({ name }) => !isReferenced(name)) &&
    (await getAllWindows()).some(
      ({ label }) => label === "broadcast" || label.startsWith("broadcast-")
    )
  )
    return true
  for (const { name } of candidates) {
    if (isReferenced(name)) continue
    const path = await join(directory, name)
    const info = await lstat(path)
    if (!info.isFile || info.isSymlink || !info.mtime) continue
    const latest = Math.max(
      info.mtime.getTime(),
      info.birthtime?.getTime() ?? 0
    )
    if (!(latest < cutoff)) {
      retry = true
      continue
    }
    const parent = await lstat(directory)
    if (
      !parent.isDirectory ||
      parent.isSymlink ||
      parent.ino !== root.ino ||
      parent.dev !== root.dev
    )
      return true
    // An edit or output transition during filesystem I/O invalidates the scan.
    if (
      referenceOwners(getPresentation).some(
        (state, index) => state !== owners[index]
      )
    )
      return true
    await remove(path)
  }
  return retry
}

let pending = Promise.resolve()
let retryTimer: ReturnType<typeof setTimeout> | undefined
export function scheduleMediaCollection(getPresentation: () => object) {
  if (!isTauri()) return
  pending = pending
    .then(async () => {
      if ((await collectPresentationMedia(getPresentation)) && !retryTimer) {
        retryTimer = setTimeout(() => {
          retryTimer = undefined
          scheduleMediaCollection(getPresentation)
        }, gracePeriod)
      }
    })
    .catch((error: unknown) => {
      console.warn(
        "[presentations] Could not collect unused cached media",
        error
      )
    })
}
