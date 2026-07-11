import { describe, expect, it } from "vitest"
import { getPipInstallCommand } from "./python-env"

describe("getPipInstallCommand", () => {
  it("runs pip through the venv Python executable on Windows", () => {
    const command = getPipInstallCommand("win32", ["numpy"])

    expect(command.slice(-4)).toEqual(["-m", "pip", "install", "numpy"])
    expect(command[0]).toMatch(/[\\/]\.venv[\\/]Scripts[\\/]python\.exe$/)
  })

  it("runs pip through the venv Python executable on Unix", () => {
    const command = getPipInstallCommand("linux", ["numpy"])

    expect(command.slice(-4)).toEqual(["-m", "pip", "install", "numpy"])
    expect(command[0].replaceAll("\\", "/")).toMatch(/\/\.venv\/bin\/python3$/)
  })
})
