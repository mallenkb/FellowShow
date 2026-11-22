import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { useBroadcastStore } from "@/stores/broadcast-store"
import { usePresentationStore } from "@/stores/presentation-store"
import { setStartupReady } from "./startup-ready"
import { allocateMediaFileName } from "./presentation-media-cache"
import { collectPresentationMedia } from "./presentation-media-gc"

const fs = vi.hoisted(() => ({
  exists: vi.fn(),
  lstat: vi.fn(),
  readDir: vi.fn(),
  readTextFile: vi.fn(),
  remove: vi.fn(),
}))
const windows = vi.hoisted(() => vi.fn())
vi.mock("@tauri-apps/plugin-fs", () => fs)
vi.mock("@tauri-apps/api/path", () => ({
  appDataDir: async () => "/app data",
  join: async (...parts: string[]) => parts.join("/"),
}))
vi.mock("@tauri-apps/api/window", () => ({ getAllWindows: windows }))

const directory = "/app data/media"
const old = new Date(0)
const file = { isFile: true, isSymlink: false, isDirectory: false, mtime: old }
const folder = { isFile: false, isSymlink: false, isDirectory: true }
const names = Array.from(
  { length: 12 },
  (_, i) => `00000000-0000-4000-a000-${String(i).padStart(12, "0")}.mp4`
)
const path = (name: string) => `${directory}/${name}`
const url = (name: string) =>
  `asset://localhost/${encodeURIComponent(path(name))}`
const entry = (name: string) => ({ name, ...file })
const collect = () => collectPresentationMedia(usePresentationStore.getState)

beforeEach(() => {
  vi.resetAllMocks()
  fs.exists.mockResolvedValue(true)
  fs.readTextFile.mockResolvedValue("{}")
  fs.readDir.mockResolvedValue(names.map(entry))
  fs.lstat.mockImplementation((name: string) =>
    name === directory ? folder : file
  )
  windows.mockResolvedValue([])
})
afterEach(() => {
  useBroadcastStore.setState(useBroadcastStore.getInitialState(), true)
  usePresentationStore.setState(usePresentationStore.getInitialState(), true)
})

it("reclaims only the old orphan across saved slides, documents, themes, overlays, announcements and both outputs", async () => {
  fs.readTextFile.mockImplementation((name: string) => {
    if (name.endsWith("presentation-documents.json"))
      return JSON.stringify({
        slides: [{ layers: [{ url: url(names[0]) }] }],
        documents: [{ pages: [{ cachedPath: path(names[1]) }] }],
      })
    if (name.endsWith("broadcast-themes.json"))
      return JSON.stringify({
        customThemes: [{ background: { image: { url: url(names[2]) } } }],
        overlayConfig: { logos: [{ imageUrl: url(names[3]) }] },
      })
    if (name.endsWith("announcements.json"))
      return JSON.stringify({
        giving: { background: { url: url(names[4]) } },
      })
    throw new Error(name)
  })
  const verse = { reference: "", segments: [] }
  const theme = useBroadcastStore.getState().themes[0]
  const image = (i: number) => ({ name: "Video", url: url(names[i]) })
  useBroadcastStore.setState({
    themes: [
      {
        ...theme,
        background: {
          ...theme.background,
          image: {
            url: url(names[5]),
            fit: "cover",
            blur: 0,
            brightness: 100,
            tint: null,
          },
        },
      },
    ],
    liveVerse: {
      ...verse,
      presentationImage: { ...image(6), layers: [image(7)] },
    },
    previewVerse: {
      ...verse,
      presentationImage: {
        name: "Preview",
        url: `http://asset.localhost/C%3A%5CFellowShow%5Cmedia%5C${names[8].toUpperCase()}#t=2`,
      },
    },
  })
  usePresentationStore.getState().addSlides([
    {
      id: "slide",
      name: "Unflushed slide",
      url: url(names[9]),
      createdAt: 0,
      pinned: false,
      locked: false,
      fit: "contain",
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      layers: [
        {
          id: "layer",
          ...image(10),
          fit: "contain",
          scale: 1,
          offsetX: 0,
          offsetY: 0,
        },
      ],
    },
  ])
  await collect()
  expect(fs.remove.mock.calls).toEqual([[path(names[11])]])
})

it("keeps recent copies, unknown ages and unclaimed imports", async () => {
  const fresh = new Date(Date.now() - 9 * 60_000)
  const imported = allocateMediaFileName("movie.mp4")
  fs.readDir.mockResolvedValue([...names.slice(0, 3), imported].map(entry))
  fs.lstat.mockImplementation((name: string) => {
    if (name === directory) return folder
    if (name === path(names[0])) return { ...file, birthtime: fresh }
    if (name === path(names[1])) return { ...file, mtime: fresh }
    if (name === path(names[2])) return { ...file, mtime: null }
    return file
  })
  await collect()
  expect(fs.remove).not.toHaveBeenCalled()
})

it("ignores traversal, subdirectories, unknown names and links", async () => {
  const unsafe = [
    "../" + names[0],
    "C:\\elsewhere\\" + names[1],
    "/video/" + names[2],
    names[3] + "/../movie.mp4",
    names[4] + "%2F..",
    "operator-video.mp4",
  ]
  fs.readDir.mockResolvedValue([
    ...unsafe.map(entry),
    { ...entry(names[5]), isSymlink: true },
    { ...folder, name: names[6] },
    entry(names[7]),
  ])
  fs.lstat.mockImplementation((name: string) =>
    name === directory ? folder : { ...file, isSymlink: true }
  )
  await collect()
  expect(fs.lstat.mock.calls).toEqual([[directory], [path(names[7])]])
  expect(fs.remove).not.toHaveBeenCalled()
  fs.lstat.mockResolvedValue({ ...folder, isSymlink: true })
  await collect()
  expect(fs.readDir).toHaveBeenCalledTimes(1)
})

it("skips a pass when a projector may still hold its last frame or saved references are unreadable", async () => {
  windows.mockResolvedValueOnce([{ label: "broadcast-alt" }])
  await collect()
  fs.readTextFile.mockResolvedValueOnce("broken JSON")
  await expect(collect()).rejects.toThrow()
  expect(fs.remove).not.toHaveBeenCalled()
})

it("keeps media sent live while its file metadata is being read", async () => {
  let notifyReading!: () => void
  const reading = new Promise<void>((resolve) => {
    notifyReading = resolve
  })
  let finishRead!: (info: typeof file) => void
  const metadata = new Promise<typeof file>((resolve) => {
    finishRead = resolve
  })
  fs.lstat.mockImplementation((name: string) => {
    if (name === directory) return folder
    notifyReading()
    return metadata
  })
  const running = collect()
  await reading
  useBroadcastStore.setState({
    liveVerse: {
      reference: "",
      segments: [],
      presentationImage: { name: "Live", url: url(names[0]) },
    },
  })
  finishRead(file)
  await running
  expect(fs.remove).not.toHaveBeenCalled()
})

it("waits for startup hydration before inspecting the cache", async () => {
  let hydrate!: () => void
  setStartupReady(
    new Promise<void>((resolve) => {
      hydrate = resolve
    })
  )
  try {
    const running = collect()
    await Promise.resolve()
    expect(fs.exists).not.toHaveBeenCalled()
    hydrate()
    await running
    expect(fs.readDir).toHaveBeenCalled()
  } finally {
    setStartupReady(Promise.resolve())
  }
})
