import { describe, expect, it } from "vitest"
import { getZipExtractionCommand } from "./download-sources"

describe("getZipExtractionCommand", () => {
  it("uses PowerShell Expand-Archive on Windows", () => {
    expect(
      getZipExtractionCommand("win32", "C:\\tmp\\refs.zip", "C:\\tmp\\refs")
    ).toEqual([
      "powershell",
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      "Expand-Archive -LiteralPath $args[0] -DestinationPath $args[1] -Force",
      "C:\\tmp\\refs.zip",
      "C:\\tmp\\refs",
    ])
  })

  it("uses unzip on Unix platforms", () => {
    expect(
      getZipExtractionCommand("linux", "/tmp/refs.zip", "/tmp/refs")
    ).toEqual(["unzip", "-o", "/tmp/refs.zip", "-d", "/tmp/refs"])
  })
})
