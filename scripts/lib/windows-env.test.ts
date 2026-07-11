import { describe, expect, it } from "vitest"
import { buildTauriCommand, withWindowsBuildEnvironment } from "./windows-env"

describe("buildTauriCommand", () => {
  it("invokes the current Bun executable instead of the bunx shell shim", () => {
    expect(buildTauriCommand("C:\\Tools\\bun.exe", ["info"])).toEqual([
      "C:\\Tools\\bun.exe",
      "x",
      "tauri",
      "info",
    ])
  })
})

describe("withWindowsBuildEnvironment", () => {
  it("discovers LLVM and CMake in their standard Windows locations", () => {
    const existing = new Set([
      "C:\\Program Files\\LLVM\\bin\\libclang.dll",
      "C:\\Program Files\\CMake\\bin\\cmake.exe",
    ])

    const env = withWindowsBuildEnvironment(
      "win32",
      { ProgramFiles: "C:\\Program Files", Path: "C:\\Windows" },
      (path) => existing.has(path)
    )

    expect(env.LIBCLANG_PATH).toBe("C:\\Program Files\\LLVM\\bin")
    expect(env.PATH).toBe(
      "C:\\Program Files\\LLVM\\bin;C:\\Program Files\\CMake\\bin;C:\\Windows"
    )
    expect(env.Path).toBeUndefined()
  })

  it("does not modify build paths outside Windows", () => {
    const source = { PATH: "/usr/bin" }
    expect(withWindowsBuildEnvironment("linux", source, () => true)).toEqual(
      source
    )
  })
})
