import { beforeEach, describe, expect, it, vi } from "vitest"

const mockGet = vi.fn()
const mockSet = vi.fn()
const mockSave = vi.fn()
const mockDelete = vi.fn()
const mockHas = vi.fn()
const mockLoad = vi.fn()
const mockInvoke = vi.fn()

vi.mock("@tauri-apps/plugin-store", () => ({
  load: (...args: unknown[]) => mockLoad(...args),
}))

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}))

async function flushSave(): Promise<void> {
  // Advance past the debounce window, then let the chained
  // pendingSave promise resolve.
  await vi.advanceTimersByTimeAsync(300)
  await Promise.resolve()
  await Promise.resolve()
}

describe("settings store", () => {
  beforeEach(async () => {
    vi.useFakeTimers()
    mockGet.mockReset()
    mockSet.mockReset()
    mockSave.mockReset()
    mockDelete.mockReset()
    mockHas.mockReset()
    mockLoad.mockReset()
    mockInvoke.mockReset()
    mockHas.mockResolvedValue(false)
    mockInvoke.mockImplementation(async (command: string) => {
      if (command === "load_secure_settings") return {}
      return undefined
    })
    mockLoad.mockResolvedValue({
      get: mockGet,
      set: mockSet,
      delete: mockDelete,
      has: mockHas,
      save: mockSave,
    })
    vi.resetModules()
  })

  it("validates settings at startup and migrates legacy secrets on explicit unlock", async () => {
    mockHas.mockImplementation(async (key: string) => key === "deepgramApiKey")
    mockGet.mockImplementation(async (key: string) => {
      if (key === "gain") return 2.5
      if (key === "sttProvider") return "whisper"
      if (key === "deepgramApiKey") return "dg-key"
      return null
    })

    const { hydrateSettings, unlockSecureSettings, useSettingsStore } =
      await import("./settings-store")
    await hydrateSettings()
    expect(mockInvoke).not.toHaveBeenCalled()
    await unlockSecureSettings()

    const state = useSettingsStore.getState()
    expect(state.gain).toBe(1)
    expect(state.sttProvider).toBe("whisper")
    expect(state.deepgramApiKey).toBe("dg-key")
    expect(mockGet).toHaveBeenCalledWith("deepgramApiKey")
    expect(mockInvoke).toHaveBeenCalledWith("save_secure_settings", {
      secrets: { deepgramApiKey: "dg-key" },
    })
    expect(mockDelete).toHaveBeenCalledWith("deepgramApiKey")
    expect(state.autoMode).toBe(false)
    expect(state.confidenceThreshold).toBe(0.8)
  })

  it("hydrate with no persisted values falls back to defaults", async () => {
    mockGet.mockResolvedValue(null)

    const { hydrateSettings, useSettingsStore } =
      await import("./settings-store")
    const before = useSettingsStore.getState()
    await hydrateSettings()
    const after = useSettingsStore.getState()

    expect(after.gain).toBe(before.gain)
    expect(after.sttProvider).toBe(before.sttProvider)
    expect(after.autoMode).toBe(before.autoMode)
    expect(after.autoUpdateEnabled).toBe(true)
    expect(after.pinnedTranslationIds).toEqual([6, 2])
    expect(after.defaultPinnedTranslationsApplied).toBe(true)
    expect(mockSet).toHaveBeenCalledWith("pinnedTranslationIds", [6, 2])
    expect(mockSet).toHaveBeenCalledWith(
      "defaultPinnedTranslationsApplied",
      true
    )
  })

  it("does not open the vault for startup or ordinary settings changes", async () => {
    mockGet.mockResolvedValue(null)
    const { hydrateSettings, saveSettingsNow, useSettingsStore } =
      await import("./settings-store")
    await hydrateSettings()
    useSettingsStore.getState().setGain(0.5)
    await saveSettingsNow()
    expect(mockInvoke).not.toHaveBeenCalled()
  })

  it("shares one vault request across concurrent unlocks", async () => {
    mockGet.mockResolvedValue(null)
    const { unlockSecureSettings } = await import("./settings-store")
    await Promise.all([unlockSecureSettings(), unlockSecureSettings()])
    expect(
      mockInvoke.mock.calls.filter(
        ([command]) => command === "load_secure_settings"
      )
    ).toHaveLength(1)
  })

  it("does not overwrite stored secrets when access is denied", async () => {
    mockGet.mockResolvedValue(null)
    mockInvoke.mockRejectedValue(new Error("access denied"))
    const { unlockSecureSettings, saveSettingsNow, useSettingsStore } =
      await import("./settings-store")
    await expect(unlockSecureSettings()).rejects.toThrow("access denied")
    useSettingsStore.getState().setGain(0.5)
    await saveSettingsNow()
    expect(mockInvoke).not.toHaveBeenCalledWith(
      "save_secure_settings",
      expect.anything()
    )
  })

  it("hydrates the automatic update preference", async () => {
    mockGet.mockImplementation(async (key: string) => {
      if (key === "autoUpdateEnabled") return false
      return null
    })

    const { hydrateSettings, useSettingsStore } =
      await import("./settings-store")
    await hydrateSettings()

    expect(useSettingsStore.getState().autoUpdateEnabled).toBe(false)
  })

  it("uses NKJV and NIV as default pinned translations", async () => {
    const { DEFAULT_PINNED_TRANSLATION_IDS, useSettingsStore } =
      await import("./settings-store")

    expect(DEFAULT_PINNED_TRANSLATION_IDS).toEqual([6, 2])
    expect(useSettingsStore.getState().pinnedTranslationIds).toEqual(
      DEFAULT_PINNED_TRANSLATION_IDS
    )
  })

  it("a setter call after hydration writes the full snapshot to disk", async () => {
    mockGet.mockResolvedValue(null)

    const { hydrateSettings, useSettingsStore } =
      await import("./settings-store")
    await hydrateSettings()
    mockSet.mockClear()
    mockSave.mockClear()

    useSettingsStore.getState().setGain(1.75)

    // Debounced — nothing written yet.
    expect(mockSet).not.toHaveBeenCalled()
    expect(mockSave).not.toHaveBeenCalled()

    await flushSave()

    expect(mockSet).toHaveBeenCalledWith("gain", 1.75)
    expect(mockSave).toHaveBeenCalledTimes(1)
  })

  it("rapid setter calls coalesce into a single save", async () => {
    mockGet.mockResolvedValue(null)

    const { hydrateSettings, useSettingsStore } =
      await import("./settings-store")
    await hydrateSettings()
    mockSave.mockClear()

    const { setGain } = useSettingsStore.getState()
    setGain(1.1)
    setGain(1.2)
    setGain(1.3)

    await flushSave()

    expect(mockSave).toHaveBeenCalledTimes(1)
    expect(mockSet).toHaveBeenCalledWith("gain", 1.3)
  })

  it("saveSettingsNow persists API keys", async () => {
    mockGet.mockResolvedValue(null)

    const {
      hydrateSettings,
      unlockSecureSettings,
      saveSettingsNow,
      useSettingsStore,
    } = await import("./settings-store")
    await hydrateSettings()
    await unlockSecureSettings()
    mockSet.mockClear()
    mockSave.mockClear()

    useSettingsStore.getState().setDeepgramApiKey("dg-key")
    await saveSettingsNow()

    expect(mockInvoke).toHaveBeenCalledWith("save_secure_settings", {
      secrets: { deepgramApiKey: "dg-key" },
    })
    expect(mockSet).not.toHaveBeenCalledWith("deepgramApiKey", "dg-key")
    expect(mockSave).toHaveBeenCalledTimes(1)
  })

  it("concurrent hydrate calls attach only one subscription", async () => {
    mockGet.mockResolvedValue(null)

    const { hydrateSettings, useSettingsStore } =
      await import("./settings-store")
    // Kick off two concurrent hydrations — a second caller must not
    // attach a duplicate subscription that would double every write.
    await Promise.all([hydrateSettings(), hydrateSettings()])
    mockSave.mockClear()

    useSettingsStore.getState().setGain(1.5)
    await flushSave()

    expect(mockSave).toHaveBeenCalledTimes(1)
  })

  it("hydrate handles load rejection gracefully", async () => {
    mockLoad.mockRejectedValue(new Error("store not available"))
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

    const { hydrateSettings, useSettingsStore } =
      await import("./settings-store")
    await expect(hydrateSettings()).resolves.toBeUndefined()

    // Defaults preserved
    expect(useSettingsStore.getState().gain).toBe(1.0)
    expect(warnSpy).toHaveBeenCalledWith(
      "[settings] Failed to load persisted state, using defaults"
    )
    warnSpy.mockRestore()
  })

  it("persist handles save rejection gracefully", async () => {
    mockGet.mockResolvedValue(null)
    mockSave.mockRejectedValue(new Error("disk error"))
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

    const { hydrateSettings, useSettingsStore } =
      await import("./settings-store")
    await hydrateSettings()

    useSettingsStore.getState().setAutoMode(true)
    await flushSave()

    expect(warnSpy).toHaveBeenCalledWith(
      "[settings] Failed to persist settings",
      expect.any(Error)
    )
    warnSpy.mockRestore()
  })
})
