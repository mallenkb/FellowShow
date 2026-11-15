import { describe, expect, it } from "vitest"
import type { MonitorInfo } from "@/lib/ipc"
import {
  reconcileOutputScreens,
  resolveOutputScreen,
  sanitizeScreenIdentity,
  screenIdentityFor,
  screenLabel,
} from "@/lib/screen-identity"

function monitor(
  index: number,
  name: string,
  x: number,
  isPrimary = false
): MonitorInfo {
  return { index, name, x, y: 0, width: 1920, height: 1080, isPrimary }
}

const laptop = {
  ...monitor(0, "Monitor #1", 0, true),
  width: 3456,
  height: 2234,
}
const scripture = monitor(1, "Monitor #18287", 1728)
const overlays = monitor(2, "Monitor #18288", 3648)

describe("resolveOutputScreen", () => {
  it("finds the saved screen after the OS lists screens in a new order", () => {
    const reordered = [
      laptop,
      { ...overlays, index: 1 },
      { ...scripture, index: 2 },
    ]
    const result = resolveOutputScreen(
      { monitorIndex: 1, screen: screenIdentityFor(scripture) },
      reordered
    )
    expect(result).toEqual({
      kind: "found",
      monitor: { ...scripture, index: 2 },
    })
  })

  it("follows a screen by name when the operator rearranges displays", () => {
    const moved = { ...scripture, x: -1920 }
    const result = resolveOutputScreen(
      { monitorIndex: 1, screen: screenIdentityFor(scripture) },
      [laptop, moved, overlays]
    )
    expect(result).toEqual({ kind: "found", monitor: moved })
  })

  it("follows a screen by position when the OS renames it", () => {
    const renamed = { ...scripture, name: "Monitor #99" }
    const result = resolveOutputScreen(
      { monitorIndex: 1, screen: screenIdentityFor(scripture) },
      [laptop, renamed, overlays]
    )
    expect(result).toEqual({ kind: "found", monitor: renamed })
  })

  it("reports a missing screen instead of using whatever is at its old index", () => {
    const stranger = monitor(1, "Monitor #5", 1728)
    const result = resolveOutputScreen(
      {
        monitorIndex: 1,
        screen: { ...screenIdentityFor(scripture), x: 5000 },
      },
      [laptop, { ...stranger, x: 9000 }]
    )
    expect(result.kind).toBe("missing")
  })

  it("does not guess between two screens with the same name", () => {
    const twinA = monitor(1, "GoStream", 1728)
    const twinB = monitor(2, "GoStream", 3648)
    const result = resolveOutputScreen(
      { monitorIndex: 1, screen: { ...screenIdentityFor(twinA), x: 100 } },
      [laptop, twinA, twinB]
    )
    expect(result.kind).toBe("missing")
  })

  it("tells twin screens apart by position", () => {
    const twinA = monitor(1, "GoStream", 1728)
    const twinB = monitor(2, "GoStream", 3648)
    const result = resolveOutputScreen(
      { monitorIndex: 1, screen: screenIdentityFor(twinB) },
      [laptop, twinA, twinB]
    )
    expect(result).toEqual({ kind: "found", monitor: twinB })
  })

  it("uses the saved index for outputs saved before screen identities", () => {
    expect(
      resolveOutputScreen({ monitorIndex: 2 }, [laptop, scripture, overlays])
    ).toEqual({ kind: "found", monitor: overlays })
    expect(resolveOutputScreen({ monitorIndex: null }, [laptop])).toEqual({
      kind: "unset",
    })
  })
})

describe("reconcileOutputScreens", () => {
  it("moves each output to its own screen when four screens reorder", () => {
    const four = monitor(3, "Monitor #18289", 5568)
    const outputs = [
      {
        id: "main",
        outputType: "display",
        monitorIndex: 1,
        screen: screenIdentityFor(scripture),
      },
      {
        id: "overlays",
        outputType: "display",
        monitorIndex: 2,
        screen: screenIdentityFor(overlays),
      },
      {
        id: "lyrics",
        outputType: "display",
        monitorIndex: 3,
        screen: screenIdentityFor(four),
      },
    ]
    const reordered = [
      laptop,
      { ...four, index: 1 },
      { ...scripture, index: 2 },
      { ...overlays, index: 3 },
    ]
    const changes = reconcileOutputScreens(outputs, reordered)
    expect(changes.main?.monitorIndex).toBe(2)
    expect(changes.overlays?.monitorIndex).toBe(3)
    expect(changes.lyrics?.monitorIndex).toBe(1)
  })

  it("clears the position of an output whose screen is unplugged", () => {
    const changes = reconcileOutputScreens(
      [
        {
          id: "overlays",
          outputType: "display",
          monitorIndex: 2,
          screen: screenIdentityFor(overlays),
        },
      ],
      [laptop, scripture]
    )
    expect(changes.overlays).toEqual({
      monitorIndex: null,
      screen: screenIdentityFor(overlays),
    })
  })

  it("saves an identity for outputs that only have an index", () => {
    const changes = reconcileOutputScreens(
      [{ id: "main", outputType: "display", monitorIndex: 1 }],
      [laptop, scripture]
    )
    expect(changes.main).toEqual({
      monitorIndex: 1,
      screen: screenIdentityFor(scripture),
    })
  })

  it("leaves NDI outputs and unchanged outputs alone", () => {
    const changes = reconcileOutputScreens(
      [
        {
          id: "main",
          outputType: "display",
          monitorIndex: 1,
          screen: screenIdentityFor(scripture),
        },
        { id: "ndi", outputType: "ndi", monitorIndex: null },
      ],
      [laptop, scripture]
    )
    expect(changes).toEqual({})
  })

  it("changes nothing when no screens are listed", () => {
    expect(
      reconcileOutputScreens(
        [{ id: "main", outputType: "display", monitorIndex: 1 }],
        []
      )
    ).toEqual({})
  })
})

describe("sanitizeScreenIdentity", () => {
  it("keeps a valid identity and rejects malformed ones", () => {
    const valid = screenIdentityFor(scripture)
    expect(sanitizeScreenIdentity(valid)).toEqual(valid)
    expect(sanitizeScreenIdentity({ ...valid, name: "" })).toBeNull()
    expect(sanitizeScreenIdentity({ ...valid, width: 0 })).toBeNull()
    expect(sanitizeScreenIdentity({ ...valid, x: 1.5 })).toBeNull()
    expect(sanitizeScreenIdentity("Monitor #1")).toBeNull()
  })
})

describe("screenLabel", () => {
  it("names the laptop and numbers the other screens", () => {
    expect(screenLabel(laptop)).toBe("Laptop")
    expect(screenLabel(overlays)).toBe("Screen 3")
  })
})
