// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PresentationDocumentList } from "./presentation-document-list"
import {
  type PresentationDocument,
  usePresentationStore,
} from "@/stores/presentation-store"

vi.mock("@tauri-apps/plugin-fs", () => ({
  remove: vi.fn(async () => {}),
}))
vi.mock("@tauri-apps/plugin-store", () => ({
  load: vi.fn(async () => {}),
}))

function document(id: string, name: string): PresentationDocument {
  return {
    id,
    name,
    sourcePath: `/fixtures/${name}.pdf`,
    createdAt: 1,
    status: "ready",
    totalPages: 1,
    error: null,
    pages: [
      {
        id: `${id}-page-1`,
        documentId: id,
        pageNumber: 1,
        name: `${name} page 1`,
        url: `/fixtures/${name}.png`,
        cachedPath: null,
        width: 960,
        height: 540,
        fit: "contain",
        scale: 1,
        offsetX: 0,
        offsetY: 0,
      },
    ],
  }
}

const documents = [
  document("first", "First document"),
  document("second", "Second document"),
]

function renderDocuments(items = documents) {
  usePresentationStore.setState({ documents: items })
  render(
    <PresentationDocumentList documents={items} selectedDocumentId="first" />
  )
}

beforeEach(() => {
  usePresentationStore.setState({
    documents,
    selectedDocumentId: "first",
    selectedPageId: "first-page-1",
  })
})

afterEach(cleanup)

describe("document list operator controls", () => {
  it("exposes selection and removal as separate buttons", async () => {
    const user = userEvent.setup()
    renderDocuments()
    const select = screen.getByRole("button", {
      name: "Select Second document",
    })
    const remove = screen.getByRole("button", {
      name: "Remove Second document",
    })
    expect(select.contains(remove)).toBe(false)
    expect(select.closest('[role="button"]')).toBeNull()

    await user.click(select)

    expect(usePresentationStore.getState().selectedDocumentId).toBe("second")
    expect(usePresentationStore.getState().selectedPageId).toBe("second-page-1")
    expect(usePresentationStore.getState().documents).toHaveLength(2)
  })

  it.each(["{Enter}", " "])(
    "selects with keyboard %s without deleting",
    async (key) => {
      const user = userEvent.setup()
      renderDocuments()
      screen.getByRole("button", { name: "Select Second document" }).focus()

      await user.keyboard(key)

      expect(usePresentationStore.getState().selectedDocumentId).toBe("second")
      expect(usePresentationStore.getState().documents).toHaveLength(2)
    }
  )

  it("removes only the document whose Remove button is activated", async () => {
    const user = userEvent.setup()
    renderDocuments()

    await user.click(
      screen.getByRole("button", { name: "Remove Second document" })
    )

    expect(
      usePresentationStore.getState().documents.map((item) => item.id)
    ).toEqual(["first"])
    expect(usePresentationStore.getState().selectedDocumentId).toBe("first")
  })

  it("keeps the Remove button disabled while a document is importing", async () => {
    const user = userEvent.setup()
    renderDocuments([documents[0], { ...documents[1], status: "importing" }])
    const remove = screen.getByRole("button", {
      name: "Remove Second document",
    })
    expect(remove.hasAttribute("disabled")).toBe(true)

    await user.click(remove)

    expect(usePresentationStore.getState().documents).toHaveLength(2)
  })
})
