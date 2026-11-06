import { useCallback, useEffect, useRef, useState } from "react"
import { FolderPlusIcon, Trash2Icon, UploadIcon } from "lucide-react"
import { toast } from "sonner"
import { EasyWorshipImportButton } from "@/components/songs/easyworship-import-button"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  createSongCollection,
  getSongCollectionSummaries,
  importSongCollection,
  removeEasyWorshipSongs,
  removeSongCollection,
  setSongCollectionEnabled,
  type SongCollectionSummary,
} from "@/lib/songs-data"
import { useSongEditorStore } from "@/stores/song-editor-store"
import { useSongFilterStore } from "@/stores/song-filter-store"

export function SongCollectionsSection() {
  const [collections, setCollections] = useState<SongCollectionSummary[]>([])
  const [name, setName] = useState("")
  const [busy, setBusy] = useState(false)
  const [removing, setRemoving] = useState<SongCollectionSummary | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const refresh = useCallback(async () => {
    setCollections(await getSongCollectionSummaries())
  }, [])

  useEffect(() => {
    void refresh().catch(() => toast.error("Could not load song collections."))
  }, [refresh])

  async function run(action: () => Promise<void>, success: string) {
    setBusy(true)
    try {
      await action()
      await refresh()
      useSongEditorStore.getState().markCatalogChanged()
      toast.success(success)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not update song collections."
      )
    } finally {
      setBusy(false)
    }
  }

  function clearCurrentFilter(collection: SongCollectionSummary) {
    const source =
      collection.kind === "collection"
        ? `collection:${collection.id}`
        : collection.id
    if (useSongFilterStore.getState().source === source)
      useSongFilterStore.getState().setSource("all")
  }

  const easyworshipCount =
    collections.find((item) => item.kind === "easyworship")?.count ?? 0
  return (
    <div className="flex w-full max-w-3xl flex-col gap-5">
      <p className="text-sm text-muted-foreground">
        Add collections and choose which ones appear in Songs.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0]
            event.currentTarget.value = ""
            if (file)
              void run(
                async () => importSongCollection(await file.text()),
                "Collection imported."
              )
          }}
        />
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          <UploadIcon /> Import collection
        </Button>
        <div className="flex items-center gap-2 text-sm">
          <EasyWorshipImportButton
            importedCount={easyworshipCount}
            onSongsChanged={() => {
              void refresh().catch(() =>
                toast.error("Could not load song collections.")
              )
              useSongEditorStore.getState().markCatalogChanged()
            }}
            onRequestRemove={() =>
              setRemoving(
                collections.find((item) => item.kind === "easyworship") ?? null
              )
            }
          />
          <span>EasyWorship</span>
        </div>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          const collectionName = name
          void run(async () => {
            await createSongCollection(collectionName)
            setName("")
          }, "Collection created.")
        }}
      >
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="New collection name"
          aria-label="New collection name"
        />
        <Button type="submit" variant="outline" disabled={busy || !name.trim()}>
          <FolderPlusIcon /> Create
        </Button>
      </form>

      {collections.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">
          No song collections yet. Import one or create your own.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {collections.map((collection) => (
            <div
              key={`${collection.kind}:${collection.id}`}
              className="flex items-center gap-3 rounded-lg border border-border px-4 py-3"
            >
              <Switch
                checked={collection.enabled}
                disabled={busy}
                aria-label={`Show ${collection.name} in Songs`}
                onCheckedChange={(enabled) =>
                  void run(
                    async () => {
                      await setSongCollectionEnabled(collection.id, enabled)
                      if (!enabled) clearCurrentFilter(collection)
                    },
                    enabled ? "Collection enabled." : "Collection hidden."
                  )
                }
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {collection.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {collection.count} song{collection.count === 1 ? "" : "s"}
                </p>
              </div>
              {collection.kind !== "custom" && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={busy}
                  aria-label={`Remove ${collection.name}`}
                  onClick={() => setRemoving(collection)}
                >
                  <Trash2Icon className="size-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => {
          if (!open) setRemoving(null)
        }}
        title={`Remove ${removing?.name ?? "collection"}?`}
        description="Songs in this collection will be removed from FellowShow, including edits made here."
        confirmLabel="Remove collection"
        destructive
        onConfirm={() => {
          if (!removing) return
          const collection = removing
          void run(async () => {
            if (collection.kind === "easyworship")
              await removeEasyWorshipSongs()
            else await removeSongCollection(collection.id)
            clearCurrentFilter(collection)
          }, "Collection removed.")
        }}
      />
    </div>
  )
}
