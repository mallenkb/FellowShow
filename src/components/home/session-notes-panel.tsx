import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getSermonSummaryView } from "@/lib/sermon-summary-layout"
import { getSessionNotes } from "@/lib/sermon-summary-text"
import { SavedWorkspaceSermonNotes } from "./saved-workspace-sermon-notes"
import { SessionSummary } from "./session-summary"
import type { SermonSession } from "@/types"

export function SessionNotesPanel({ session }: { session: SermonSession }) {
  const notes = getSessionNotes(session)
  const { captured } = notes
  const summary = getSermonSummaryView(session, notes)

  return (
    <Tabs
      defaultValue={
        summary.sections.length || !captured.length ? "summary" : "captured"
      }
      className="gap-4"
    >
      <TabsList aria-label="Sermon notes" className="workspace-segment-track">
        <TabsTrigger value="summary" className="workspace-segment">
          Summary
        </TabsTrigger>
        <TabsTrigger value="captured" className="workspace-segment">
          Captured notes
        </TabsTrigger>
        <TabsTrigger value="workspace" className="workspace-segment">
          Sermon notes
        </TabsTrigger>
      </TabsList>
      <TabsContent
        value="summary"
        forceMount
        className="data-[state=inactive]:hidden"
      >
        <SessionSummary key={session.id} session={session} summary={summary} />
      </TabsContent>
      <TabsContent value="captured">
        {captured.length > 0 ? (
          <ul className="list-disc space-y-2 pl-5">
            {captured.map((note) => (
              <li key={note.id} className="whitespace-pre-wrap">
                {note.text}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">
            {session.notes.length > 0
              ? "All captured notes appear in the saved notes."
              : "No captured notes yet."}
          </p>
        )}
      </TabsContent>
      <TabsContent value="workspace">
        <SavedWorkspaceSermonNotes session={session} />
      </TabsContent>
    </Tabs>
  )
}
