import { afterEach, describe, expect, it, vi } from "vitest"
import { FuzzRandom } from "@/lib/__test__/fuzz"

const storage = vi.hoisted(() => ({ values: new Map<string, unknown>() }))
const invoke = vi.hoisted(() => vi.fn())
vi.mock("@tauri-apps/api/core", () => ({ invoke }))
vi.mock("@tauri-apps/plugin-store", () => ({
  load: async () => ({
    get: async (key: string) => storage.values.get(key),
    set: async (key: string, value: unknown) => {
      storage.values.set(key, value)
    },
    save: async () => {},
    has: async (key: string) => storage.values.has(key),
    delete: async (key: string) => storage.values.delete(key),
  }),
}))

afterEach(() => {
  vi.useRealTimers()
})

describe("persisted settings fuzzing", () => {
  it("loads malformed profiles with bounded settings and no vault access", async () => {
    vi.useFakeTimers()
    const seed = Number(process.env.FUZZ_SEED ?? 0x5eed2026)
    const random = new FuzzRandom(seed ^ 70)
    const cases = Math.min(1_000, Number(process.env.FUZZ_CASES ?? 1_000))
    for (let i = 0; i < cases; i += 1) {
      vi.resetModules()
      invoke.mockClear()
      storage.values = new Map([
        ["schemaVersion", 1],
        ["defaultPinnedTranslationsApplied", true],
        ...[
          "gain",
          "confidenceThreshold",
          "cooldownMs",
          "sttProvider",
          "autoMode",
          "autoUpdateEnabled",
          "audioDeviceId",
        ].map((key): [string, unknown] => [key, random.value()]),
        ["pinnedTranslationIds", [random.number(), random.number(), 6, 6]],
        ["hiddenTranslationIds", [random.number(), random.value()]],
        [
          "extraSearchTabs",
          [random.text(10), "timer", "timer", "on-display", random.value()],
        ],
      ])
      const { hydrateSettings, useSettingsStore } =
        await import("./settings-store")
      await hydrateSettings()
      const state = useSettingsStore.getState()
      const replay = `seed=${seed} salt=70 profile=${i}`
      expect(
        Number.isFinite(state.gain) && state.gain >= 0 && state.gain <= 2,
        replay
      ).toBe(true)
      expect(
        Number.isFinite(state.confidenceThreshold) &&
          state.confidenceThreshold >= 0 &&
          state.confidenceThreshold <= 1,
        replay
      ).toBe(true)
      expect(
        Number.isInteger(state.cooldownMs) &&
          state.cooldownMs >= 0 &&
          state.cooldownMs <= 60_000,
        replay
      ).toBe(true)
      expect(["deepgram", "whisper", "openai", "groq"], replay).toContain(
        state.sttProvider
      )
      for (const ids of [
        state.pinnedTranslationIds,
        state.hiddenTranslationIds,
      ]) {
        expect(
          ids.every((id) => Number.isSafeInteger(id) && id > 0),
          replay
        ).toBe(true)
        expect(new Set(ids).size, replay).toBe(ids.length)
      }
      expect(state.extraSearchTabs, replay).toEqual(["timer", "on-display"])
      expect(typeof state.autoMode, replay).toBe("boolean")
      expect(invoke, replay).not.toHaveBeenCalled()
    }
  }, 30_000)
})
