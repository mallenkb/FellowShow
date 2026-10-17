import { FileTextIcon, LoaderCircleIcon, TrashIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  type PresentationDocument,
  usePresentationStore,
} from "@/stores/presentation-store"

export function PresentationDocumentList({
  documents,
  selectedDocumentId,
}: {
  documents: PresentationDocument[]
  selectedDocumentId: string | null
}) {
  if (documents.length === 0) return null

  return (
    <>
      <div className="flex items-center gap-2 px-1 py-1 text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
        <span>Documents</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      {documents.map((document) => {
        const isActive = document.id === selectedDocumentId
        return (
          <article
            key={document.id}
            className={cn(
              "flex items-center gap-3 rounded-lg border p-3 transition-colors",
              isActive
                ? "border-[#101084]/60 bg-[#101084]/10 dark:border-[#F1E600] dark:bg-[#F1E600]/4"
                : "border-border bg-background/30 hover:bg-muted/40"
            )}
          >
            <button
              type="button"
              aria-label={`Select ${document.name}`}
              aria-pressed={isActive}
              className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() =>
                usePresentationStore.getState().selectDocument(document.id)
              }
            >
              <FileTextIcon className="size-5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">
                  {document.name}
                </span>
                <span className="block text-[0.625rem] text-muted-foreground">
                  {document.status === "importing"
                    ? `Importing ${document.pages.length}${
                        document.totalPages > 0
                          ? ` of ${document.totalPages}`
                          : ""
                      } pages`
                    : document.status === "error"
                      ? "Import failed"
                      : `${document.pages.length} page${
                          document.pages.length === 1 ? "" : "s"
                        }`}
                </span>
              </span>
              {document.status === "importing" ? (
                <LoaderCircleIcon className="size-4 shrink-0 animate-spin text-muted-foreground" />
              ) : null}
            </button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove ${document.name}`}
              disabled={document.status === "importing"}
              onClick={() => {
                usePresentationStore.getState().removeDocument(document.id)
              }}
            >
              <TrashIcon className="size-4" />
            </Button>
          </article>
        )
      })}
    </>
  )
}
