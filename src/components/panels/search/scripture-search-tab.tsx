import { useRef } from "react"
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
}: {
  mode: ScriptureSearchMode
  isActive: boolean
  onRequestMode: (mode: ScriptureSearchMode) => void
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
      <ScriptureToolbar controller={controller} mode={mode} />
      {!controller.hasAvailableScripture ? (
        <ScriptureDownloadPrompt />
      ) : mode === "book" && !controller.showPhraseResults ? (
        <ScriptureBookResults controller={controller} />
      ) : (
        <ScriptureContextResults controller={controller} />
      )}
    </div>
  )
}
