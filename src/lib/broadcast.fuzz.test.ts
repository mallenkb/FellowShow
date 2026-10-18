import { describe, expect, it } from "vitest"
import { fuzzCases } from "./__test__/fuzz"
import {
  assignDefaultMonitorIndices,
  getOutputProgramPayload,
  MAX_BROADCAST_OUTPUTS,
  OUTPUT_CONTENT_OPTIONS,
  sanitizeOutputConfigs,
} from "./broadcast-outputs"
import {
  getLowerThirdOpacity,
  getOverlayPayloadForOutput,
  sanitizeOverlayConfiguration,
} from "./overlays"
import type { VerseRenderData } from "@/types"

describe("broadcast fuzzing", () => {
  it("keeps saved outputs unique, bounded, and stable after sanitizing", () => {
    fuzzCases(
      (r) =>
        Array.from({ length: r.integer(1, 20) }, () => ({
          id: r.pick(["main", "alt", `output-${r.integer(1, 12)}`, r.text(10)]),
          name: r.text(10),
          content: r.pick([
            ...OUTPUT_CONTENT_OPTIONS.map((v) => v.value),
            "bad",
          ]),
          themeId: r.pick(["valid", "missing", null]),
          outputType: r.pick(["ndi", "display", "bad"]),
          monitorIndex: r.number(),
          ndi: r.pick([
            r.value(),
            {
              sourceName: r.text(30),
              resolution: r.pick(["r720p", "r1080p", "r4k", r.value()]),
              frameRate: r.pick(["fps24", "fps30", "fps60", r.value()]),
              alphaMode: r.pick([
                "noneOpaque",
                "straightAlpha",
                "premultipliedAlpha",
                r.value(),
              ]),
              ndiActive: true,
            },
          ]),
        })),
      (input) => {
        const outputs = sanitizeOutputConfigs(input, new Set(["valid"]))
        if (!outputs) return
        expect(outputs.length).toBeLessThanOrEqual(MAX_BROADCAST_OUTPUTS)
        expect(new Set(outputs.map((v) => v.id)).size).toBe(outputs.length)
        expect(outputs.filter((v) => v.id === "main")).toHaveLength(1)
        expect(
          outputs.every(
            (v) =>
              v.monitorIndex === null || Number.isSafeInteger(v.monitorIndex)
          )
        ).toBe(true)
        for (const output of outputs) {
          if (!output.ndi) continue
          expect(output.ndi.sourceName.trim().length).toBeGreaterThan(0)
          expect(output.ndi.sourceName).not.toContain("\0")
          expect(["r720p", "r1080p", "r4k"]).toContain(output.ndi.resolution)
          expect(["fps24", "fps30", "fps60"]).toContain(output.ndi.frameRate)
          expect([
            "noneOpaque",
            "straightAlpha",
            "premultipliedAlpha",
          ]).toContain(output.ndi.alphaMode)
          expect(Object.keys(output.ndi).sort()).toEqual([
            "alphaMode",
            "frameRate",
            "resolution",
            "sourceName",
          ])
        }
        expect(sanitizeOutputConfigs(outputs, new Set(["valid"]))).toEqual(
          outputs
        )
        expect(
          JSON.stringify(
            sanitizeOutputConfigs(
              JSON.parse(JSON.stringify(outputs)),
              new Set(["valid"])
            )
          )
        ).toBe(JSON.stringify(outputs))
      },
      30
    )
  })

  it("routes each content role without leaking unrelated program content", () => {
    fuzzCases(
      (r) => ({
        content: r.pick(OUTPUT_CONTENT_OPTIONS).value,
        section: r.pick([
          "bible",
          "songs",
          "announcements",
          "presentation",
        ] as const),
        live: r.pick([true, false]),
        text: r.text(),
      }),
      ({ content, section, live, text }) => {
        const verse: VerseRenderData = {
          reference: text,
          themeSection: section,
          segments: [{ text }],
        }
        const payload = getOutputProgramPayload(content, live, verse, null)
        const shouldShow =
          live && (content === "everything" || content === section)
        expect(payload.verse).toBe(shouldShow ? verse : null)
        expect(payload.timer).toBeNull()
      },
      31
    )
  })

  it("assigns real monitor indexes and avoids overlap while free screens exist", () => {
    fuzzCases(
      (r) => ({
        monitors: Array.from({ length: r.integer(0, 8) }, (_, i) => ({
          isPrimary: i === 0,
        })),
        outputs: Array.from({ length: r.integer(0, 6) }, (_, i) => ({
          id: `output-${i}`,
          outputType: "display" as const,
          monitorIndex: r.pick([null, r.number()]),
        })),
      }),
      ({ monitors, outputs }) => {
        const assignments = assignDefaultMonitorIndices(outputs, monitors)
        for (const index of Object.values(assignments)) {
          expect(
            Number.isInteger(index) && index >= 0 && index < monitors.length
          ).toBe(true)
        }
        if (monitors.length) {
          for (const output of outputs) {
            const index = assignments[output.id] ?? output.monitorIndex
            expect(
              index !== null &&
                Number.isInteger(index) &&
                index >= 0 &&
                index < monitors.length
            ).toBe(true)
          }
        }
        if (!monitors.length) expect(assignments).toEqual({})
        const unassigned = outputs.map((o) => ({ ...o, monitorIndex: null }))
        const fresh = Object.values(
          assignDefaultMonitorIndices(unassigned, monitors)
        )
        if (outputs.length <= monitors.length)
          expect(new Set(fresh).size).toBe(fresh.length)
        if (fresh.length && monitors.length > 1) expect(fresh[0]).toBe(1)
      },
      32
    )
  })

  it("sanitizes overlay geometry, times, colors, and targets into serializable settings", () => {
    fuzzCases(
      (r) => {
        const fields = {
          xPercent: r.number(),
          yPercent: r.number(),
          widthPercent: r.number(),
          sizePercent: r.number(),
          durationMs: r.number(),
          createdAt: r.number(),
          updatedAt: r.number(),
          targetOutputIds: ["main", "main", "missing", r.text(6)],
          backgroundColor: r.text(10),
        }
        return {
          logo: {
            logos: [{ ...fields, id: "logo", imageUrl: "asset://logo.png" }],
          },
          tickerMessages: [{ ...fields, id: "ticker", text: "hello" }],
          lowerThirdPresets: [{ ...fields, id: "lower", title: "Speaker" }],
        }
      },
      (input) => {
        const config = sanitizeOverlayConfiguration(input, ["main", "alt"])
        for (const item of [
          ...config.tickerMessages,
          ...config.lowerThirdPresets,
        ]) {
          expect(
            Number.isFinite(item.createdAt) && Number.isFinite(item.updatedAt)
          ).toBe(true)
        }
        expect(
          JSON.stringify(
            sanitizeOverlayConfiguration(JSON.parse(JSON.stringify(config)), [
              "main",
              "alt",
            ])
          )
        ).toBe(JSON.stringify(config))
        expect(sanitizeOverlayConfiguration(config, ["main", "alt"])).toEqual(
          config
        )
        for (const item of [
          ...config.logo.logos,
          ...config.lowerThirdPresets,
        ]) {
          expect(item.xPercent >= 0 && item.xPercent <= 100).toBe(true)
          expect(item.yPercent >= 0 && item.yPercent <= 100).toBe(true)
          expect(item.targetOutputIds).toEqual(["main"])
        }
      },
      33
    )
  })

  it("honors overlay targets, protected content, and lower-third expiry", () => {
    fuzzCases(
      (r) => ({
        target: r.pick(["main", "alt"]),
        now: r.integer(0, 100_000),
        section: r.pick([
          "bible",
          "songs",
          "announcements",
          "presentation",
        ] as const),
      }),
      ({ target, now, section }) => {
        const config = sanitizeOverlayConfiguration(
          {
            logo: {
              logos: [
                { id: "logo", imageUrl: "logo.png", targetOutputIds: [target] },
              ],
            },
            tickerMessages: [
              { id: "ticker", text: "hello", targetOutputIds: [target] },
            ],
            lowerThirdPresets: [
              {
                id: "lower",
                title: "Speaker",
                targetOutputIds: [target],
                durationMs: 10_000,
              },
            ],
          },
          ["main", "alt"]
        )
        const active = {
          logoVisible: true,
          tickerMessageId: "ticker",
          tickerStartedAt: 1000,
          lowerThird: { preset: config.lowerThirdPresets[0], startedAt: 1000 },
          barId: null,
          barStartedAt: null,
        }
        const payload = getOverlayPayloadForOutput(config, active, target, now)
        expect(payload.logos).toHaveLength(1)
        expect(payload.ticker?.text).toBe("hello")
        expect(Boolean(payload.lowerThird)).toBe(now < 11_000)
        const opacity = getLowerThirdOpacity(
          { startedAt: 1000, durationMs: 10_000 },
          now
        )
        expect(Number.isFinite(opacity) && opacity >= 0 && opacity <= 1).toBe(
          true
        )
        expect(
          getOverlayPayloadForOutput(
            config,
            active,
            target === "main" ? "alt" : "main",
            now
          )
        ).toEqual({ logos: [], ticker: null, lowerThird: null, bar: null })
        const protectedPayload = getOverlayPayloadForOutput(
          config,
          active,
          target,
          {
            verse: { reference: "", themeSection: section, segments: [] },
            timer: null,
          },
          now
        )
        // Graphics show only over live video, so any Program content hides them.
        expect(protectedPayload.logos).toHaveLength(0)
      },
      34
    )
  })
})
