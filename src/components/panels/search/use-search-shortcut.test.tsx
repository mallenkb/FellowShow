// @vitest-environment jsdom

import { useState } from "react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useSearchShortcut } from "./use-search-shortcut"
import { useAppNavigationStore } from "@/stores/app-navigation-store"

type Tab = "book" | "context" | "songs" | "notes" | "media"

function Workspace() {
  const [tab, setTab] = useState<Tab>("book")
  const [songQuery, setSongQuery] = useState("")
  const { scriptureSearchRef, songSearchRef } = useSearchShortcut(tab, setTab)

  return (
    <>
      <button type="button" onClick={() => setTab("book")}>
        Bible
      </button>
      <button type="button" onClick={() => setTab("songs")}>
        Songs
      </button>
      <button type="button" onClick={() => setTab("notes")}>
        Notes
      </button>
      <button type="button" onClick={() => setTab("media")}>
        Media
      </button>
      <div hidden={tab !== "book" && tab !== "context"}>
        <input ref={scriptureSearchRef} aria-label="Search Bible" />
      </div>
      {tab === "songs" ? (
        <input
          ref={songSearchRef}
          aria-label="Search songs"
          value={songQuery}
          onChange={(event) => setSongQuery(event.target.value)}
        />
      ) : null}
      {tab === "notes" ? <textarea aria-label="Note editor" /> : null}
      <output aria-label="Current page">{tab}</output>
    </>
  )
}

beforeEach(() => useAppNavigationStore.setState({ screen: "workspace" }))
afterEach(cleanup)

describe("search shortcut", () => {
  it("focuses the search on the current Bible or Songs page", async () => {
    const user = userEvent.setup()
    render(<Workspace />)

    await user.click(screen.getByRole("button", { name: "Bible" }))
    await user.keyboard("/")
    const bible = screen.getByRole("textbox", { name: "Search Bible" })
    expect(document.activeElement).toBe(bible)
    expect((bible as HTMLInputElement).value).toBe("")

    await user.click(screen.getByRole("button", { name: "Songs" }))
    await user.keyboard("/")
    const songs = screen.getByRole("textbox", { name: "Search songs" })
    expect(document.activeElement).toBe(songs)
    expect((songs as HTMLInputElement).value).toBe("")
  })

  it("returns to the most recently used search from another page", async () => {
    const user = userEvent.setup()
    render(<Workspace />)

    await user.click(screen.getByRole("button", { name: "Songs" }))
    await user.type(
      screen.getByRole("textbox", { name: "Search songs" }),
      "grace"
    )
    await user.click(screen.getByRole("button", { name: "Notes" }))
    await user.keyboard("/")

    const songs = screen.getByRole("textbox", { name: "Search songs" })
    expect(document.activeElement).toBe(songs)
    expect((songs as HTMLInputElement).value).toBe("grace")
    expect(screen.getByLabelText("Current page").textContent).toBe("songs")

    await user.click(screen.getByRole("button", { name: "Bible" }))
    await user.click(screen.getByRole("button", { name: "Media" }))
    await user.keyboard("/")
    expect(document.activeElement).toBe(
      screen.getByRole("textbox", { name: "Search Bible" })
    )
  })

  it("does not capture slash while the user is editing", async () => {
    const user = userEvent.setup()
    render(<Workspace />)

    await user.click(screen.getByRole("button", { name: "Notes" }))
    const editor = screen.getByRole("textbox", { name: "Note editor" })
    await user.click(editor)
    await user.keyboard("/")

    expect((editor as HTMLTextAreaElement).value).toBe("/")
    expect(document.activeElement).toBe(editor)
    expect(screen.getByLabelText("Current page").textContent).toBe("notes")
  })

  it("does not capture modified or composing shortcuts", async () => {
    const user = userEvent.setup()
    render(<Workspace />)
    const bible = screen.getByRole("button", { name: "Bible" })
    await user.click(bible)

    fireEvent.keyDown(bible, { key: "/", ctrlKey: true })
    fireEvent.keyDown(bible, { key: "/", isComposing: true })
    expect(document.activeElement).toBe(bible)
  })

  it("does not capture keys while a modal is open", async () => {
    const user = userEvent.setup()
    render(
      <>
        <Workspace />
        <div role="dialog" aria-modal="true" aria-label="Settings">
          <button type="button">Close settings</button>
        </div>
      </>
    )

    const close = screen.getByRole("button", { name: "Close settings" })
    await user.click(close)
    fireEvent.keyDown(close, { key: "/" })
    expect(document.activeElement).toBe(close)
  })
})
