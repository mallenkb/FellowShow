// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ReturnFeedPanel } from "./return-feed-panel"

vi.mock("@tauri-apps/plugin-store", () => ({
  load: vi.fn(() => Promise.resolve()),
}))

afterEach(() => {
  cleanup()
})

describe("ReturnFeedPanel", () => {
  it("collapses and expands like the other panels", async () => {
    const user = userEvent.setup()
    render(<ReturnFeedPanel />)
    const header = screen.getByRole("button", { name: /GoStream return/ })

    expect(header.getAttribute("aria-expanded")).toBe("true")
    expect(screen.getByLabelText("GoStream live output")).toBeTruthy()

    await user.click(header)
    expect(header.getAttribute("aria-expanded")).toBe("false")
    expect(screen.queryByLabelText("GoStream live output")).toBeNull()

    await user.click(header)
    expect(screen.getByLabelText("GoStream live output")).toBeTruthy()
  })
})
