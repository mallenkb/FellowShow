import { beforeEach, describe, expect, it, vi } from "vitest"
import { copyFile, remove } from "@tauri-apps/plugin-fs"
import { validatePresentationMedia } from "./media-validation"
import { cachePresentationMediaPath } from "./presentation-media"

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: vi.fn(() => true),
  convertFileSrc: vi.fn((path: string) => `asset://localhost${path}`),
}))
vi.mock("@tauri-apps/api/path", () => ({
  appDataDir: vi.fn(async () => "/test-app"),
  join: vi.fn(async (...parts: string[]) => parts.join("/")),
}))
vi.mock("@tauri-apps/plugin-fs", () => ({
  copyFile: vi.fn(async () => {}),
  mkdir: vi.fn(async () => {}),
  remove: vi.fn(async () => {}),
  writeFile: vi.fn(async () => {}),
}))
vi.mock("./media-validation", () => ({
  validatePresentationMedia: vi.fn(async () => {}),
}))

beforeEach(() => vi.clearAllMocks())

describe("native media imports", () => {
  it("validates the cached image before returning its persistent URL", async () => {
    const url = await cachePresentationMediaPath("/source/image.png", "image")
    expect(copyFile).toHaveBeenCalledWith(
      "/source/image.png",
      expect.stringMatching(/^\/test-app\/media\/.+\.png$/)
    )
    expect(validatePresentationMedia).toHaveBeenCalledWith(url, "image")
    expect(remove).not.toHaveBeenCalled()
  })

  it("removes a corrupted cached video and reports the decode failure", async () => {
    vi.mocked(validatePresentationMedia).mockRejectedValueOnce(
      new Error("The selected video is damaged.")
    )
    await expect(
      cachePresentationMediaPath("/source/broken.mp4", "video")
    ).rejects.toThrow("video is damaged")
    expect(remove).toHaveBeenCalledWith(
      expect.stringMatching(/^\/test-app\/media\/.+\.mp4$/)
    )
  })
})
