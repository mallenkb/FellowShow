import { useState } from "react"
import { XIcon } from "lucide-react"
import { useQueueStore } from "@/stores"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PreachingSummaryPanel } from "@/components/panels/preaching-summary-panel"
import { RelatedScripturesPanel } from "@/components/panels/related-scriptures-panel"
import { SermonScripturesPanel } from "@/components/panels/sermon-scriptures-panel"
import { SongsQueuePanel } from "@/components/panels/songs-queue-panel"

type QueuePanelTab = "sermon" | "related" | "summary"

type QueuePanelMode = "book" | "context" | "songs" | "presentation" | "timer"

export function QueuePanel({ mode }: { mode: QueuePanelMode }) {
  const [activeTab, setActiveTab] = useState<QueuePanelTab>("sermon")
  if (mode === "songs") return <SongsQueuePanel />

  return (
    <Tabs
      data-slot="queue-panel"
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as QueuePanelTab)}
      className="flex min-h-0 flex-col gap-0 overflow-hidden rounded-lg border border-border bg-card outline-none focus:outline-none focus-visible:ring-0 focus-visible:outline-none"
    >
      <div className="relative z-20 flex min-h-11 shrink-0 items-center justify-between gap-2 border-b border-border bg-card px-3 py-2">
        <TabsList
          variant="default"
          className="h-7 min-w-0 justify-start gap-1 bg-transparent p-0"
        >
          <TabsTrigger
            value="sermon"
            className="h-7 flex-none rounded-md border border-border bg-background px-2.5 text-xs text-muted-foreground after:hidden hover:bg-muted/50 hover:text-foreground dark:bg-background/40 dark:hover:bg-muted/40 data-active:border-[#101084]/50 data-active:bg-[#101084]/15 data-active:text-[#101084] dark:data-active:border-[#F1E600]/50 dark:data-active:bg-[#F1E600]/15 dark:data-active:text-[#F1E600]"
          >
            Sermon scriptures
          </TabsTrigger>
          <TabsTrigger
            value="related"
            className="h-7 flex-none rounded-md border border-border bg-background px-2.5 text-xs text-muted-foreground after:hidden hover:bg-muted/50 hover:text-foreground dark:bg-background/40 dark:hover:bg-muted/40 data-active:border-[#101084]/50 data-active:bg-[#101084]/15 data-active:text-[#101084] dark:data-active:border-[#F1E600]/50 dark:data-active:bg-[#F1E600]/15 dark:data-active:text-[#F1E600]"
          >
            Related scriptures
          </TabsTrigger>
          <TabsTrigger
            value="summary"
            className="h-7 flex-none rounded-md border border-border bg-background px-2.5 text-xs text-muted-foreground after:hidden hover:bg-muted/50 hover:text-foreground dark:bg-background/40 dark:hover:bg-muted/40 data-active:border-[#101084]/50 data-active:bg-[#101084]/15 data-active:text-[#101084] dark:data-active:border-[#F1E600]/50 dark:data-active:bg-[#F1E600]/15 dark:data-active:text-[#F1E600]"
          >
            Preaching summary
          </TabsTrigger>
        </TabsList>

        {activeTab === "sermon" ? (
          <button
            type="button"
            aria-label="Clear sermon scriptures"
            title="Clear sermon scriptures"
            onClick={() => useQueueStore.getState().clearQueue()}
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            <XIcon className="size-3" />
          </button>
        ) : null}
      </div>

      <TabsContent
        value="sermon"
        forceMount
        className="flex min-h-0 flex-1 data-[state=inactive]:hidden"
      >
        <SermonScripturesPanel />
      </TabsContent>

      <TabsContent
        value="related"
        forceMount
        className="flex min-h-0 flex-1 data-[state=inactive]:hidden"
      >
        <RelatedScripturesPanel />
      </TabsContent>

      <TabsContent
        value="summary"
        forceMount
        className="flex min-h-0 flex-1 data-[state=inactive]:hidden"
      >
        <PreachingSummaryPanel />
      </TabsContent>
    </Tabs>
  )
}
