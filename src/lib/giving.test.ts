import { describe, expect, it } from "vitest"
import {
  createDefaultGivingDetails,
  givingPlainText,
  givingRenderData,
  givingToVerse,
  sanitizeGivingDetails,
} from "./giving"
import type { GivingDetails } from "@/types"

const details: GivingDetails = {
  heading: "Give with Mobile Money",
  accounts: [
    { id: "a", network: "mtn-momo", number: " 123456 " },
    { id: "b", network: "telecel-cash", number: "" },
  ],
  accountName: "Example Assembly",
  reference: "Tithe + your name",
}

describe("givingRenderData", () => {
  it("lists only accounts with a number, then the name and reference", () => {
    const page = givingRenderData(details)
    expect(page?.heading).toBe("Give with Mobile Money")
    const lines = page?.items[0]?.blocks.map((block) =>
      block.runs.map((run) => run.text).join("")
    )
    expect(lines).toEqual([
      "MTN MoMo: 123456",
      "Name: Example Assembly",
      "Reference: Tithe + your name",
    ])
  })

  it("returns null until a number is entered", () => {
    expect(givingRenderData(createDefaultGivingDetails())).toBeNull()
    expect(givingToVerse(createDefaultGivingDetails())).toBeNull()
  })

  it("builds an announcements verse labelled Offering", () => {
    expect(givingToVerse(details)).toMatchObject({
      themeSection: "announcements",
      announcementSetName: "Offering",
    })
  })
})

describe("givingPlainText", () => {
  it("joins the slide into one ticker line", () => {
    expect(givingPlainText(details)).toBe(
      "Give with Mobile Money · MTN MoMo: 123456 · Name: Example Assembly · Reference: Tithe + your name"
    )
  })
})

describe("sanitizeGivingDetails", () => {
  it("falls back to defaults for missing or malformed data", () => {
    const sanitized = sanitizeGivingDetails(undefined)
    expect(sanitized.heading).toBe("Give with Mobile Money")
    expect(sanitized.accounts).toHaveLength(1)
  })

  it("drops accounts with an unknown network or missing id", () => {
    const sanitized = sanitizeGivingDetails({
      heading: "Offering",
      accounts: [
        { id: "a", network: "mtn-momo", number: "1" },
        { id: "b", network: "paypal", number: "2" },
        { network: "bank", number: "3" },
      ],
      accountName: 42,
    })
    expect(sanitized.accounts.map((account) => account.id)).toEqual(["a"])
    expect(sanitized.accountName).toBe("")
    expect(sanitized.reference).toBe("Tithe + your name")
  })
})
