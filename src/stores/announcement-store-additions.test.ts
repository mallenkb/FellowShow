import { beforeEach, describe, expect, it, vi } from "vitest"
import { useAnnouncementStore } from "./announcement-store"
import { createDefaultGivingDetails } from "@/lib/giving"

vi.mock("@tauri-apps/plugin-store", () => ({
  load: vi.fn(() => Promise.resolve()),
}))

describe("offering slide state", () => {
  beforeEach(() => {
    useAnnouncementStore.setState({
      sets: [],
      selectedSetId: null,
      selectedItemId: null,
      giving: createDefaultGivingDetails(),
      givingSelected: false,
    })
  })

  it("opens the offering slide and returns to notes on note selection", () => {
    const store = useAnnouncementStore.getState()
    store.selectGiving()
    expect(useAnnouncementStore.getState().givingSelected).toBe(true)
    store.selectItem("note-1")
    expect(useAnnouncementStore.getState().givingSelected).toBe(false)
  })

  it("adds the next unused network and edits and removes accounts", () => {
    const store = useAnnouncementStore.getState()
    store.addGivingAccount()
    const accounts = useAnnouncementStore.getState().giving.accounts
    expect(accounts.map((account) => account.network)).toEqual([
      "mtn-momo",
      "telecel-cash",
    ])

    const second = accounts[1]
    if (!second) throw new Error("expected a second account")
    store.updateGivingAccount(second.id, { number: "0200000000" })
    expect(useAnnouncementStore.getState().giving.accounts[1]?.number).toBe(
      "0200000000"
    )

    store.removeGivingAccount(second.id)
    expect(useAnnouncementStore.getState().giving.accounts).toHaveLength(1)
  })

  it("stops adding accounts at the limit", () => {
    const store = useAnnouncementStore.getState()
    for (let i = 0; i < 10; i += 1) store.addGivingAccount()
    expect(useAnnouncementStore.getState().giving.accounts).toHaveLength(6)
  })
})

describe("note order and show-until dates", () => {
  beforeEach(() => {
    useAnnouncementStore.setState({
      sets: [],
      selectedSetId: null,
      selectedItemId: null,
    })
    useAnnouncementStore.getState().createSet()
    const setId = useAnnouncementStore.getState().selectedSetId ?? ""
    useAnnouncementStore.getState().addItem(setId)
    useAnnouncementStore.getState().addItem(setId)
  })

  const titles = () =>
    useAnnouncementStore.getState().sets[0]?.items.map((item) => item.title)

  it("moves a note to a new position", () => {
    const setId = useAnnouncementStore.getState().selectedSetId ?? ""
    useAnnouncementStore.getState().moveItem(setId, 2, 0)
    expect(titles()).toEqual([
      "Announcement 3",
      "Announcement 1",
      "Announcement 2",
    ])
  })

  it("ignores moves outside the list", () => {
    const setId = useAnnouncementStore.getState().selectedSetId ?? ""
    useAnnouncementStore.getState().moveItem(setId, 0, 5)
    expect(titles()).toEqual([
      "Announcement 1",
      "Announcement 2",
      "Announcement 3",
    ])
  })

  it("sets and clears a show-until date", () => {
    const state = useAnnouncementStore.getState()
    const setId = state.selectedSetId ?? ""
    const itemId = state.sets[0]?.items[0]?.id ?? ""
    state.setItemShowUntil(setId, itemId, "2026-10-19")
    expect(useAnnouncementStore.getState().sets[0]?.items[0]?.showUntil).toBe(
      "2026-10-19"
    )
    useAnnouncementStore.getState().setItemShowUntil(setId, itemId, null)
    expect(
      useAnnouncementStore.getState().sets[0]?.items[0]
    ).not.toHaveProperty("showUntil")
  })
})
