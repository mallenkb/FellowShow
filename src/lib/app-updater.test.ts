// @vitest-environment jsdom

import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { installStagedUpdate, prepareAvailableUpdate } from "./app-updater"

const update = vi.hoisted(() => ({
  version: "2",
  download: vi.fn(async () => {}),
  downloadAndInstall: vi.fn(async () => {}),
  install: vi.fn(async () => {}),
}))
const check = vi.hoisted(() => vi.fn<() => Promise<typeof update | null>>())
vi.mock("@tauri-apps/api/core", () => ({ isTauri: () => true }))
vi.mock("@tauri-apps/plugin-updater", () => ({ check }))

beforeEach(() => {
  vi.clearAllMocks()
  check.mockResolvedValue(update)
})

afterEach(() => vi.restoreAllMocks())

it.each([true, false])(
  "defers the Windows installer until approved exit (restart=%s)",
  async (restart) => {
    vi.spyOn(window.navigator, "platform", "get").mockReturnValue("Win32")
    expect(await prepareAvailableUpdate()).toEqual({
      kind: "available",
      version: "2",
    })
    expect(update.download).toHaveBeenCalledOnce()
    expect(update.downloadAndInstall).not.toHaveBeenCalled()
    expect(update.install).not.toHaveBeenCalled()
    expect(await prepareAvailableUpdate()).toEqual({
      kind: "available",
      version: "2",
    })
    expect(check).toHaveBeenCalledOnce()
    await installStagedUpdate(restart)
    expect(update.install).toHaveBeenCalledWith({
      restartAfterInstall: restart,
    })
  }
)

it("returns none when the updater finds no release", async () => {
  check.mockResolvedValueOnce(null)
  expect(await prepareAvailableUpdate()).toEqual({ kind: "none" })
})

it("returns busy while a check is in flight", async () => {
  let finishCheck!: (value: null) => void
  const pending = new Promise<null>((resolve) => {
    finishCheck = resolve
  })
  check.mockReturnValueOnce(pending)
  const firstCheck = prepareAvailableUpdate()

  try {
    expect(await prepareAvailableUpdate()).toEqual({ kind: "busy" })
    expect(check).toHaveBeenCalledOnce()
  } finally {
    finishCheck(null)
    await firstCheck
  }
  expect(await firstCheck).toEqual({ kind: "none" })
})

it("returns a feed failure and allows a retry", async () => {
  const message = "Could not fetch a valid release JSON"
  check.mockRejectedValueOnce(message).mockResolvedValueOnce(null)

  expect(await prepareAvailableUpdate()).toEqual({ kind: "error", message })
  expect(await prepareAvailableUpdate()).toEqual({ kind: "none" })
})

it("returns a preparation failure if download or install fails", async () => {
  vi.spyOn(window.navigator, "platform", "get").mockReturnValue("MacIntel")
  const message = "Disk is full"
  update.downloadAndInstall.mockRejectedValueOnce(new Error(message))
  expect(await prepareAvailableUpdate()).toEqual({ kind: "error", message })
})
