import { useEffect, useLayoutEffect, useRef } from "react"
import { useAppNavigationStore } from "@/stores/app-navigation-store"

type SearchableTab = "book" | "context" | "songs"

function isSearchableTab(tab: string): tab is SearchableTab {
  return tab === "book" || tab === "context" || tab === "songs"
}

function isEditingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return Boolean(
    (target instanceof HTMLElement && target.isContentEditable) ||
    target.closest(
      'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="searchbox"], [role="combobox"], [role="spinbutton"], [role="menu"], [role="dialog"], [role="alertdialog"]'
    )
  )
}

export function useSearchShortcut(
  activeTab: string,
  setSearchTab: (tab: SearchableTab) => void
) {
  const scriptureSearchRef = useRef<HTMLInputElement>(null)
  const songSearchRef = useRef<HTMLInputElement>(null)
  const lastSearchTabRef = useRef<SearchableTab>("book")
  const focusSearchOnTabChangeRef = useRef(false)

  useLayoutEffect(() => {
    if (isSearchableTab(activeTab)) lastSearchTabRef.current = activeTab
    if (!focusSearchOnTabChangeRef.current) return
    focusSearchOnTabChangeRef.current = false
    const input =
      activeTab === "songs" ? songSearchRef.current : scriptureSearchRef.current
    input?.focus()
  }, [activeTab])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        useAppNavigationStore.getState().screen === "home" ||
        event.key !== "/" ||
        event.defaultPrevented ||
        event.isComposing ||
        event.repeat ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        isEditingTarget(event.target) ||
        isEditingTarget(document.activeElement) ||
        document.querySelector(
          'dialog[open], [role="dialog"][aria-modal="true"], [role="alertdialog"][aria-modal="true"]'
        )
      )
        return

      if (isSearchableTab(activeTab)) {
        const input =
          activeTab === "songs"
            ? songSearchRef.current
            : scriptureSearchRef.current
        if (!input || input.disabled) return
        event.preventDefault()
        input.focus()
        return
      }

      event.preventDefault()
      focusSearchOnTabChangeRef.current = true
      setSearchTab(lastSearchTabRef.current)
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [activeTab, setSearchTab])

  return { scriptureSearchRef, songSearchRef }
}
