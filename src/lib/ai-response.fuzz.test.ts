import { afterEach, describe, expect, it, vi } from "vitest"
import { fuzzCasesAsync } from "./__test__/fuzz"
import { generateSermonSummary } from "./sermon-ai-summary"

const settings = vi.hoisted(() => ({
  aiProvider: "openrouter",
  openRouterApiKey: "synthetic-test-key",
  openRouterModel: "test-model",
  sermonOpenAiApiKey: "synthetic-test-key",
  sermonOpenAiModel: "test-model",
}))
vi.mock("@/stores/settings-store", () => ({
  DEFAULT_OPENAI_MODEL: "test-model",
  DEFAULT_OPENROUTER_MODEL: "test-model",
  useSettingsStore: { getState: () => settings },
}))
afterEach(() => {
  vi.unstubAllGlobals()
})

const transcript =
  "The speaker talked about faith and hope. The congregation listened to the message. We read the passage together and discussed its words. The speaker repeated the title and closed the meeting with prayer."

describe("AI response fuzzing with a local fetch stub", () => {
  it("parses both providers and bounds untrusted summary titles and bullets", async () => {
    let response: unknown
    vi.stubGlobal(
      "fetch",
      async () => new Response(JSON.stringify(response), { status: 200 })
    )
    await fuzzCasesAsync(
      (r) => ({
        provider: r.pick(["openai", "openrouter"]),
        title: r.text(180),
        bullets: Array.from({ length: r.integer(0, 15) }, () =>
          r.pick([r.text(300), r.value()])
        ),
      }),
      async ({ provider, title, bullets }) => {
        settings.aiProvider = provider
        const text = JSON.stringify({ title, bullets })
        response =
          provider === "openai"
            ? { output: [{ content: [{ text }] }] }
            : { choices: [{ message: { content: text } }] }
        const result = await generateSermonSummary(transcript)
        expect(result.title.length > 0 && result.title.length <= 100).toBe(true)
        expect(result.bullets.length > 0 && result.bullets.length <= 5).toBe(
          true
        )
        expect(
          result.bullets.every(
            (v) => typeof v === "string" && v.length > 0 && v.length <= 220
          )
        ).toBe(true)
        expect(new Set(result.bullets).size).toBe(result.bullets.length)
      },
      71
    )
  })

  it("returns controlled errors for malformed successful provider responses", async () => {
    let response: unknown
    vi.stubGlobal(
      "fetch",
      async () =>
        new Response(JSON.stringify(response) ?? "null", { status: 200 })
    )
    await fuzzCasesAsync(
      (r) => ({ provider: r.pick(["openai", "openrouter"]), body: r.value() }),
      async ({ provider, body }) => {
        settings.aiProvider = provider
        response = body
        await expect(generateSermonSummary(transcript)).rejects.toBeInstanceOf(
          Error
        )
      },
      72
    )
  })
})
