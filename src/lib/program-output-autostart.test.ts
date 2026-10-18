import { describe, expect, it, vi } from "vitest"
import { createOutputConfig } from "@/lib/broadcast-outputs"
import type { OutputRuntime } from "@/lib/broadcast-output-runtime"
import { pickProgramOutputToStart } from "./program-output-autostart"

vi.mock("@tauri-apps/api/event", () => ({
  emitTo: vi.fn(() => Promise.resolve()),
  listen: vi.fn(() => Promise.resolve(() => undefined)),
}))

function output(
  id: string,
  content: "everything" | "overlays" | "bible",
  outputType: "display" | "ndi",
  monitorIndex: number | null = null
) {
  return {
    ...createOutputConfig([], { content, outputType }),
    id,
    monitorIndex,
  }
}

const on = { isDisplayOpen: true } as OutputRuntime

describe("opening a display when something goes live", () => {
  it("prefers a General display that can open without asking", () => {
    const outputs = [
      output("general-no-screen", "everything", "display"),
      output("general-ndi", "everything", "ndi"),
      output("graphics", "overlays", "display", 1),
    ]
    expect(pickProgramOutputToStart(outputs, {})?.id).toBe("general-ndi")
  })

  it("falls back to the first General display when none is ready", () => {
    const outputs = [
      output("graphics", "overlays", "display", 1),
      output("general", "everything", "display"),
    ]
    expect(pickProgramOutputToStart(outputs, {})?.id).toBe("general")
  })

  it("does nothing when a program display is already on", () => {
    const outputs = [
      output("general", "everything", "display", 0),
      output("scripture", "bible", "display", 1),
    ]
    expect(pickProgramOutputToStart(outputs, { scripture: on })).toBeNull()
  })

  it("never counts a graphics output as the program display", () => {
    const outputs = [
      output("graphics", "overlays", "display", 1),
      output("general", "everything", "display", 0),
    ]
    expect(pickProgramOutputToStart(outputs, { graphics: on })?.id).toBe(
      "general"
    )
  })
})
