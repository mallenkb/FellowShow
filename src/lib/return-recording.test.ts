import { beforeEach, describe, expect, it, vi } from "vitest"

/** A tiny in-memory file system: folder path -> file name -> text. */
const disk = new Map<string, Map<string, string>>()

const writeFile = vi.fn<
  (
    path: string,
    bytes: Uint8Array,
    options?: { append?: boolean }
  ) => Promise<void>
>(() => Promise.resolve())
const truncate = vi.fn<(path: string, length: number) => Promise<void>>(
  async () => {}
)
const mkdir = vi.fn((path: string) => {
  if (!disk.has(path)) disk.set(path, new Map())
  return Promise.resolve()
})

function split(path: string): [string, string] {
  const index = path.lastIndexOf("/")
  return [path.slice(0, index), path.slice(index + 1)]
}

vi.mock("@tauri-apps/plugin-fs", () => ({
  truncate: (...args: Parameters<typeof truncate>) => truncate(...args),
  writeFile: (...args: Parameters<typeof writeFile>) => writeFile(...args),
  mkdir: (path: string) => mkdir(path),
  writeTextFile: (path: string, text: string) => {
    const [folder, name] = split(path)
    disk.get(folder)?.set(name, text)
    return Promise.resolve()
  },
  readTextFile: (path: string) => {
    const [folder, name] = split(path)
    const text = disk.get(folder)?.get(name)
    return text === undefined
      ? Promise.reject(new Error("missing"))
      : Promise.resolve(text)
  },
  readDir: (path: string) => {
    if (!disk.has(path)) return Promise.reject(new Error("missing"))
    const children = [...disk.keys()]
      .filter((key) => split(key)[0] === path)
      .map((key) => ({ name: split(key)[1], isDirectory: true, isFile: false }))
    const files = [...(disk.get(path)?.keys() ?? [])].map((name) => ({
      name,
      isDirectory: false,
      isFile: true,
    }))
    return Promise.resolve([...children, ...files])
  },
  rename: (from: string, to: string) => {
    const files = disk.get(from)
    if (!files) return Promise.reject(new Error("missing"))
    disk.delete(from)
    disk.set(to, files)
    return Promise.resolve()
  },
}))

vi.mock("@tauri-apps/api/path", () => ({
  videoDir: () => Promise.resolve("/Movies"),
  join: (...parts: string[]) => Promise.resolve(parts.join("/")),
}))

const {
  createChunkWriter,
  formatElapsed,
  pickRecordingMimeType,
  prepareSermonFolder,
  sermonFolderName,
  videoPartName,
  nextVideoPartPath,
} = await import("./return-recording")

describe("pickRecordingMimeType", () => {
  it("prefers mp4 with H.264 and AAC", () => {
    expect(pickRecordingMimeType(() => true)).toEqual({
      mimeType: "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
      extension: "mp4",
    })
  })

  it("tries candidates in order", () => {
    const tried: string[] = []
    const format = pickRecordingMimeType((type) => {
      tried.push(type)
      return type === "video/webm;codecs=vp8,opus"
    })
    expect(format).toEqual({
      mimeType: "video/webm;codecs=vp8,opus",
      extension: "webm",
    })
    expect(tried).toEqual([
      "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
      "video/mp4",
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
    ])
  })

  it("throws a plain message when nothing works", () => {
    expect(() => pickRecordingMimeType(() => false)).toThrow(
      "This computer cannot record video here."
    )
  })
})

describe("sermon folders", () => {
  const startedAt = new Date(2026, 10, 15, 9, 5, 7).getTime()
  const sermon = { id: "s1", title: "  Lifted Up  ", startedAt }

  beforeEach(() => {
    disk.clear()
  })

  it("names the folder by date and sermon title", () => {
    expect(sermonFolderName(sermon)).toBe("2026-11-15 Lifted Up")
    expect(
      sermonFolderName({ ...sermon, title: 'John 3:16 / "Love" <a|b>?*' })
    ).toBe("2026-11-15 John 316 Love ab")
    expect(sermonFolderName({ ...sermon, title: ' :?" ' })).toBe(
      "2026-11-15 Sermon"
    )
  })

  it("names each video part by the time it started", () => {
    expect(videoPartName(startedAt, "mp4")).toBe("Video 09-05-07.mp4")
  })

  it("preserves the previous video when GoStream reconnects in the same second", async () => {
    disk.set("/video", new Map([["Video 09-05-07.mp4", "previous part"]]))
    expect(await nextVideoPartPath("/video", startedAt, "mp4")).toBe(
      "/video/Video 09-05-07 (2).mp4"
    )
  })

  it("makes one folder per sermon and finds it again", async () => {
    const folder = await prepareSermonFolder(sermon)
    expect(folder).toBe("/Movies/FellowShow/2026-11-15 Lifted Up")
    await expect(prepareSermonFolder(sermon)).resolves.toBe(folder)
  })

  it("keeps two sermons with the same name apart", async () => {
    await prepareSermonFolder(sermon)
    await expect(prepareSermonFolder({ ...sermon, id: "s2" })).resolves.toBe(
      "/Movies/FellowShow/2026-11-15 Lifted Up (2)"
    )
  })

  it("renames the folder after the sermon is renamed, unless told not to", async () => {
    await prepareSermonFolder(sermon)
    const renamed = { ...sermon, title: "Grace" }
    await expect(
      prepareSermonFolder(renamed, { allowRename: false })
    ).resolves.toBe("/Movies/FellowShow/2026-11-15 Lifted Up")
    await expect(prepareSermonFolder(renamed)).resolves.toBe(
      "/Movies/FellowShow/2026-11-15 Grace"
    )
  })
})

describe("createChunkWriter", () => {
  beforeEach(() => {
    writeFile.mockReset()
    writeFile.mockImplementation(() => Promise.resolve())
  })

  it("creates the file then appends chunks in order", async () => {
    const order: number[] = []
    writeFile.mockImplementation(async (_path, bytes) => {
      // The first write is slowest; order must still hold.
      if (bytes[0] === 1)
        await new Promise((resolve) => setTimeout(resolve, 10))
      order.push(bytes[0] ?? -1)
    })
    const writer = createChunkWriter("/out.mp4")
    void writer.write(new Blob([new Uint8Array([1])]))
    void writer.write(new Blob([new Uint8Array([2])]))
    void writer.write(new Blob([new Uint8Array([3])]))
    await writer.flush()

    expect(order).toEqual([1, 2, 3])
    expect(writeFile.mock.calls.map((call) => call[2])).toEqual([
      undefined,
      { append: true },
      { append: true },
    ])
    expect(writeFile.mock.calls.every((call) => call[0] === "/out.mp4")).toBe(
      true
    )
  })

  it("retries a partial append from the last saved byte and keeps the final chunk", async () => {
    const writer = createChunkWriter("/out.mp4")
    await writer.write(new Blob(["saved"]))
    writeFile.mockRejectedValueOnce(new Error("disk full"))
    await expect(writer.write(new Blob(["partial"]))).rejects.toThrow(
      "disk full"
    )
    await expect(writer.write(new Blob(["last"]))).rejects.toThrow("disk full")
    await expect(writer.flush()).rejects.toThrow("disk full")
    await writer.retry()
    expect(truncate).toHaveBeenCalledWith("/out.mp4", 5)
    expect(
      writeFile.mock.calls
        .slice(2)
        .map((call) => new TextDecoder().decode(call[1]))
    ).toEqual(["partial", "last"])
    await writer.flush()
  })

  it("rejects flush after a failed write", async () => {
    writeFile.mockImplementationOnce(() =>
      Promise.reject(new Error("disk full"))
    )
    const writer = createChunkWriter("/out.mp4")
    await expect(writer.write(new Blob(["a"]))).rejects.toThrow("disk full")
    await expect(writer.flush()).rejects.toThrow("disk full")
  })
})

describe("formatElapsed", () => {
  it("formats minutes and hours", () => {
    expect(formatElapsed(65_000)).toBe("01:05")
    expect(formatElapsed(3_725_000)).toBe("1:02:05")
  })
})
