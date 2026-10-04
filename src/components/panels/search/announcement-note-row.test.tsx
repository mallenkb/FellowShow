// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useAnnouncementStore } from "@/stores/announcement-store"
import { useBroadcastStore } from "@/stores/broadcast-store"
import { announcementItemToVerse } from "@/lib/announcements"
import type { AnnouncementItem, AnnouncementSet } from "@/types"
import { AnnouncementNoteRow } from "./announcement-note-row"

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(() => Promise.resolve(null)),
  isTauri: () => false,
}))
vi.mock("@tauri-apps/plugin-store", () => ({
  load: vi.fn(() => Promise.resolve()),
}))
vi.mock("@tauri-apps/api/event", () => ({
  emitTo: vi.fn(() => Promise.resolve()),
  listen: vi.fn(() => Promise.resolve(() => undefined)),
}))

const item: AnnouncementItem = {
  id: "note-2",
  title: "Announcement 2",
  content: {
    type: "doc",
    content: [
      { type: "paragraph", content: [{ type: "text", text: "Prayer at 7pm" }] },
    ],
  },
}

const set: AnnouncementSet = {
  id: "notes",
  name: "Sunday notes",
  heading: "Announcements",
  items: [item],
  createdAt: 0,
  updatedAt: 0,
}

const originalPresentOnLive = useBroadcastStore.getState().presentOnLive

function renderRow(note = item) {
  useAnnouncementStore.setState({ sets: [{ ...set, items: [note] }] })
  return render(
    <AnnouncementNoteRow
      item={note}
      setId={set.id}
      index={0}
      itemCount={1}
      selected={false}
      isNext={false}
      isDropTarget={false}
      onDragStart={() => undefined}
      onDragEnter={() => undefined}
      onDrop={() => undefined}
      onDragEnd={() => undefined}
    />
  )
}

describe("Announcement note live controls", () => {
  beforeEach(() => {
    useAnnouncementStore.setState({
      sets: [set],
      selectedSetId: set.id,
      selectedItemId: null,
      givingSelected: false,
    })
    useBroadcastStore.setState({
      isLive: false,
      liveVerse: null,
      presenterTimer: null,
      previewVerse: null,
      previewTimer: null,
    })
    vi.spyOn(useBroadcastStore.getState(), "presentOnLive").mockImplementation(
      (liveVerse, presenterTimer) => {
        useBroadcastStore.setState({ isLive: true, liveVerse, presenterTimer })
      }
    )
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    useBroadcastStore.setState({ presentOnLive: originalPresentOnLive })
  })

  it("selects a note on single click without sending it live", async () => {
    const user = userEvent.setup()
    renderRow()
    await user.click(
      screen.getByRole("button", { name: "Select Announcement 2" })
    )
    expect(useAnnouncementStore.getState().selectedItemId).toBe(item.id)
    expect(useBroadcastStore.getState().presentOnLive).not.toHaveBeenCalled()
    expect(
      useBroadcastStore.getState().previewVerse?.announcementItemIds
    ).toEqual([item.id])
  })

  it.each(["click", "dblClick"] as const)(
    "%s previews the second note, changing Live only on double click",
    async (gesture) => {
      const user = userEvent.setup()
      useBroadcastStore.setState({
        isLive: true,
        liveVerse: {
          reference: "Rice",
          segments: [{ text: "The first note" }],
          announcementItemIds: ["note-1"],
        },
      })
      renderRow()
      await user[gesture](
        screen.getByRole("button", { name: "Select Announcement 2" })
      )

      expect(useBroadcastStore.getState().presentOnLive).toHaveBeenCalledTimes(
        gesture === "dblClick" ? 1 : 0
      )
      expect(
        useBroadcastStore.getState().liveVerse?.announcementItemIds
      ).toEqual([gesture === "dblClick" ? item.id : "note-1"])
      expect(useAnnouncementStore.getState().selectedItemId).toBe(item.id)
      expect(
        useBroadcastStore.getState().previewVerse?.announcementItemIds
      ).toEqual([item.id])
    }
  )

  it("does not restart the same live note on double click", async () => {
    const user = userEvent.setup()
    useBroadcastStore.setState({
      isLive: true,
      liveVerse: announcementItemToVerse(
        set,
        item.id,
        useBroadcastStore.getState().themes
      ),
      presenterTimer: null,
    })
    renderRow()
    await user.dblClick(
      screen.getByRole("button", { name: "Select Announcement 2" })
    )
    expect(useBroadcastStore.getState().presentOnLive).not.toHaveBeenCalled()
    expect(useBroadcastStore.getState().isLive).toBe(true)
  })

  it.each([false, true])(
    "sends the second card live from its padding when already live is %s",
    async (alreadyLive) => {
      const user = userEvent.setup()
      const firstItem = { ...item, id: "note-1", title: "Announcement 1" }
      const notes = [firstItem, item]
      const noteSet = { ...set, items: notes }
      useAnnouncementStore.setState({ sets: [noteSet] })
      useBroadcastStore.setState({
        isLive: alreadyLive,
        liveVerse: alreadyLive
          ? announcementItemToVerse(
              noteSet,
              firstItem.id,
              useBroadcastStore.getState().themes
            )
          : null,
      })
      render(
        <>
          {notes.map((note, index) => (
            <AnnouncementNoteRow
              key={note.id}
              item={note}
              setId={set.id}
              index={index}
              itemCount={notes.length}
              selected={false}
              isNext={false}
              isDropTarget={false}
              onDragStart={() => undefined}
              onDragEnter={() => undefined}
              onDrop={() => undefined}
              onDragEnd={() => undefined}
            />
          ))}
        </>
      )
      const secondCard = screen.getByRole("button", {
        name: "Select Announcement 2",
      }).parentElement
      if (!secondCard) throw new Error("Second note card missing")

      await user.dblClick(secondCard)

      expect(useBroadcastStore.getState().presentOnLive).toHaveBeenCalledTimes(
        1
      )
      expect(
        useBroadcastStore.getState().liveVerse?.announcementItemIds
      ).toEqual([item.id])
      expect(useAnnouncementStore.getState().selectedItemId).toBe(item.id)
    }
  )

  it("does not replace a live song with a single click", async () => {
    const user = userEvent.setup()
    useBroadcastStore.setState({
      isLive: true,
      liveVerse: {
        reference: "A song",
        themeSection: "songs",
        segments: [{ text: "Song lyrics" }],
      },
    })
    renderRow()
    await user.click(
      screen.getByRole("button", { name: "Select Announcement 2" })
    )
    expect(useBroadcastStore.getState().presentOnLive).not.toHaveBeenCalled()
  })

  it("keeps the current note live when clicking an empty note", async () => {
    const user = userEvent.setup()
    useBroadcastStore.setState({
      isLive: true,
      liveVerse: {
        reference: "Rice",
        segments: [{ text: "The first note" }],
        announcementItemIds: ["note-1"],
      },
    })
    renderRow({ ...item, content: { type: "doc", content: [] } })
    await user.click(
      screen.getByRole("button", { name: "Select Announcement 2" })
    )
    expect(useBroadcastStore.getState().presentOnLive).not.toHaveBeenCalled()
    expect(useBroadcastStore.getState().liveVerse?.announcementItemIds).toEqual(
      ["note-1"]
    )
  })

  it("shows a Stop Live button with an icon without hovering", async () => {
    const user = userEvent.setup()
    useBroadcastStore.setState({
      isLive: true,
      liveVerse: {
        reference: item.title,
        segments: [{ text: "Prayer at 7pm" }],
        announcementItemIds: [item.id],
      },
    })
    renderRow()
    const stop = screen.getByRole("button", {
      name: "Stop Live for Announcement 2",
    })
    expect(stop.textContent).toBe("Stop Live")
    expect(stop.querySelector("svg")).not.toBeNull()
    expect(stop.getAttribute("data-variant")).toBe("destructive")
    const row = stop.parentElement
    expect(row?.className).toContain("hover:bg-destructive/15")
    expect(row?.className).not.toContain("hover:bg-muted/50")

    await user.click(stop)
    expect(useBroadcastStore.getState().isLive).toBe(false)
  })

  it("sends the clicked note live once on double click", async () => {
    const user = userEvent.setup()
    renderRow()
    await user.dblClick(
      screen.getByRole("button", { name: "Select Announcement 2" })
    )
    expect(useBroadcastStore.getState().presentOnLive).toHaveBeenCalledTimes(1)
    expect(useBroadcastStore.getState().presentOnLive).toHaveBeenCalledWith(
      announcementItemToVerse(
        set,
        item.id,
        useBroadcastStore.getState().themes
      ),
      null,
      "manual"
    )
  })

  it("does not send an empty note live on double click", async () => {
    const user = userEvent.setup()
    renderRow({ ...item, content: { type: "doc", content: [] } })
    await user.dblClick(
      screen.getByRole("button", { name: "Select Announcement 2" })
    )
    expect(useBroadcastStore.getState().presentOnLive).not.toHaveBeenCalled()
  })

  it("does not send a note live when double clicking its edit button", async () => {
    const user = userEvent.setup()
    renderRow()
    await user.dblClick(
      screen.getByRole("button", { name: "Edit Announcement 2" })
    )
    expect(useBroadcastStore.getState().presentOnLive).not.toHaveBeenCalled()
  })

  it("uses the same live action for the existing Show Live button", async () => {
    const user = userEvent.setup()
    renderRow()
    await user.click(
      screen.getByRole("button", { name: "Show Announcement 2 on Live" })
    )
    expect(useBroadcastStore.getState().presentOnLive).toHaveBeenCalledTimes(1)
    expect(useBroadcastStore.getState().presentOnLive).toHaveBeenCalledWith(
      announcementItemToVerse(
        set,
        item.id,
        useBroadcastStore.getState().themes
      ),
      null,
      "manual"
    )
  })
})
