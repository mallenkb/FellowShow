import {
  LoaderCircleIcon,
  MoreHorizontalIcon,
  SparklesIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function SermonNotesHeader({
  aiLabel,
  aiHelp,
  isGenerating,
  hasSessions,
  showSessions,
  onAiClick,
  onToggleSessions,
}: {
  aiLabel: string
  aiHelp: string
  isGenerating: boolean
  hasSessions: boolean
  showSessions: boolean
  onAiClick: () => void
  onToggleSessions: () => void
}) {
  return (
    <div className="flex min-h-11 shrink-0 flex-wrap items-center gap-2 bg-surface-header px-3 py-2">
      <h2 className="text-[0.6875rem] font-medium tracking-wider whitespace-nowrap text-muted-foreground uppercase">
        Sermon notes
      </h2>
      <Button
        type="button"
        variant="ghost"
        size="xs"
        className="h-6 min-w-0 rounded-full bg-blue-500/10 px-2 text-blue-700 hover:bg-blue-500/15 hover:text-blue-800 dark:bg-blue-400/15 dark:text-blue-300 dark:hover:text-blue-200"
        title={aiHelp}
        aria-label={aiHelp}
        disabled={isGenerating}
        onClick={onAiClick}
      >
        {isGenerating ? (
          <LoaderCircleIcon className="size-3 animate-spin" />
        ) : (
          <SparklesIcon className="size-3" />
        )}
        <span className="truncate">{aiLabel}</span>
      </Button>
      <div className="ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Sermon notes options"
              title="Sermon notes options"
            >
              <MoreHorizontalIcon className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              disabled={!hasSessions}
              onSelect={onToggleSessions}
            >
              {showSessions ? "Hide sermon sessions" : "Choose sermon session"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
