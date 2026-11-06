import { useRef, type RefObject } from "react"
import { cn } from "@/lib/utils"
import { ScriptureDownloadPrompt } from "../scripture-download-prompt"
import { ScriptureBookResults } from "./scripture-book-results"
import { ScriptureContextResults } from "./scripture-context-results"
import { ScriptureToolbar } from "./scripture-toolbar"
import {
  type ScriptureSearchMode,
  useScriptureSearch,
} from "./use-scripture-search"

export function ScriptureSearchTab({
  mode,
  isActive,
  onRequestMode,
  searchInputRef,
}: {
  mode: ScriptureSearchMode
  isActive: boolean
  onRequestMode: (mode: ScriptureSearchMode) => void
  searchInputRef?: RefObject<HTMLInputElement | null>
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const controller = useScriptureSearch({ mode, isActive, onRequestMode })

  return (
    <div
      ref={panelRef}
      className={cn(
        "min-h-0 flex-1 flex-col outline-none",
        isActive ? "flex" : "hidden"
      )}
      onKeyDown={mode === "book" ? controller.handleKeyDown : undefined}
      tabIndex={-1}
    >
      <ScriptureToolbar
        controller={controller}
        mode={mode}
        searchInputRef={searchInputRef}
      />
      {!controller.hasAvailableScripture ? (
        <ScriptureDownloadPrompt
          className="border-t border-border"
          hasDownloadedTranslations={controller.hasDownloadedTranslations}
        />
      ) : mode === "book" && !controller.showPhraseResults ? (
        <ScriptureBookResults controller={controller} />
      ) : (
        <ScriptureContextResults controller={controller} />
      )}
    </div>
  )
}
