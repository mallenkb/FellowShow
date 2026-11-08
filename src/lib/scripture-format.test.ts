import { describe, expect, it } from "vitest"
import {
  formatScriptureReferences,
  spokenScriptureReferences,
} from "./scripture-format"

describe("spoken scripture formatting", () => {
  it("formats chapters and verses spoken in words", () => {
    expect(
      formatScriptureReferences("Read Exodus four and verse two today.")
    ).toBe("Read Exodus 4:2 today.")
    expect(
      formatScriptureReferences("First John chapter one, verse nine.")
    ).toBe("1 John 1:9.")
    expect(
      formatScriptureReferences(
        "Psalm one hundred and nineteen verse one hundred and seventy six."
      )
    ).toBe("Psalm 119:176.")
  })

  it("recognizes references spanning transcript segments without changing their source", () => {
    const transcript = "Exodus four and\nverse two says"
    const [match] = spokenScriptureReferences(transcript)
    expect(match.text).toBe("Exodus 4:2")
    expect(transcript.slice(match.start, match.end)).toBe(
      "Exodus four and\nverse two"
    )
  })

  it("leaves incomplete or out-of-range references as spoken", () => {
    expect(
      formatScriptureReferences("Psalm 151 verse one and John chapter three")
    ).toBe("Psalm 151 verse one and John chapter three")
  })
})
