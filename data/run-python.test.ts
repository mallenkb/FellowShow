import { describe, expect, it } from "vitest"
import { buildPythonCommand } from "./run-python"

describe("buildPythonCommand", () => {
  it("uses the Windows virtual-environment interpreter", () => {
    const command = buildPythonCommand("win32", ["script.py", "--fast"])

    expect(command[0]).toMatch(/[\\/]\.venv[\\/]Scripts[\\/]python\.exe$/)
    expect(command.slice(1)).toEqual(["script.py", "--fast"])
  })
})
