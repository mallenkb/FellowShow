import { describe, expect, it } from "vitest"
import type { MonitorInfo } from "@/lib/ipc"
import { planIdentify } from "@/lib/identify-screens"

function monitor(index: number, isPrimary = false): MonitorInfo {
  return {
    index,
    name: `Monitor #${index}`,
    x: index * 1920,
    y: 0,
    width: 1920,
    height: 1080,
    isPrimary,
  }
}

const monitors = [
  monitor(0, true),
  monitor(1),
  monitor(2),
  monitor(3),
  monitor(4),
]

describe("planIdentify", () => {
  it("labels four switcher inputs and the laptop with their outputs", () => {
    const outputs = [
      {
        id: "main",
        name: "Scripture",
        outputType: "display" as const,
        monitorIndex: 1,
      },
      {
        id: "o2",
        name: "Overlays",
        outputType: "display" as const,
        monitorIndex: 2,
      },
      {
        id: "o3",
        name: "Lyrics",
        outputType: "display" as const,
        monitorIndex: 3,
      },
      {
        id: "o4",
        name: "Announcements",
        outputType: "display" as const,
        monitorIndex: 4,
      },
    ]

    const plan = planIdentify(monitors, outputs, () => false)

    expect(plan.outputWindows).toEqual([])
    expect(plan.screens).toEqual([
      { monitorIndex: 0, title: "Laptop", detail: "Operator" },
      { monitorIndex: 1, title: "Screen 2", detail: "Scripture" },
      { monitorIndex: 2, title: "Screen 3", detail: "Overlays" },
      { monitorIndex: 3, title: "Screen 4", detail: "Lyrics" },
      { monitorIndex: 4, title: "Screen 5", detail: "Announcements" },
    ])
  })

  it("asks open output windows to draw their own label", () => {
    const outputs = [
      {
        id: "main",
        name: "Scripture",
        outputType: "display" as const,
        monitorIndex: 1,
      },
      {
        id: "o2",
        name: "Overlays",
        outputType: "display" as const,
        monitorIndex: 2,
      },
    ]

    const plan = planIdentify(
      monitors.slice(0, 3),
      outputs,
      (id) => id === "o2"
    )

    expect(plan.outputWindows).toEqual([
      {
        windowLabel: "broadcast-o2",
        label: { title: "Screen 3", detail: "Overlays" },
      },
    ])
    expect(plan.screens.map((screen) => screen.monitorIndex)).toEqual([0, 1])
  })

  it("names every output sharing a screen and ignores NDI outputs", () => {
    const outputs = [
      {
        id: "main",
        name: "Scripture",
        outputType: "display" as const,
        monitorIndex: 1,
      },
      {
        id: "o2",
        name: "Songs",
        outputType: "display" as const,
        monitorIndex: 1,
      },
      {
        id: "o3",
        name: "Overlays NDI",
        outputType: "ndi" as const,
        monitorIndex: 2,
      },
    ]

    const plan = planIdentify(monitors.slice(0, 3), outputs, () => false)

    expect(plan.screens[1]).toEqual({
      monitorIndex: 1,
      title: "Screen 2",
      detail: "Scripture, Songs",
    })
    expect(plan.screens[2]).toEqual({
      monitorIndex: 2,
      title: "Screen 3",
      detail: "Free",
    })
  })
})
