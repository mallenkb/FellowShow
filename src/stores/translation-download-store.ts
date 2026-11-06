import { listen } from "@tauri-apps/api/event"
import { create } from "zustand"
import { invoke } from "@/lib/ipc"
import type { Translation } from "@/types"
import { useBibleStore } from "./bible-store"
import { useSettingsStore } from "./settings-store"

interface DownloadState {
  abbreviation: string | null
  progress: number | null
  cancelling: boolean
  error: string | null
}

interface DownloadOperation {
  id: number | null
  cancelRequested: boolean
  cancelPromise: Promise<boolean> | null
}

let currentOperation: DownloadOperation | null = null

export const useTranslationDownloadStore = create<DownloadState>(() => ({
  abbreviation: null,
  progress: null,
  cancelling: false,
  error: null,
}))

export const translationDownloadActions = {
  async start(translation: Translation): Promise<void> {
    if (currentOperation) return
    const operation: DownloadOperation = {
      id: null,
      cancelRequested: false,
      cancelPromise: null,
    }
    currentOperation = operation
    const { abbreviation } = translation
    useTranslationDownloadStore.setState({
      abbreviation,
      progress: null,
      cancelling: false,
      error: null,
    })

    let unlisten: (() => void) | undefined
    try {
      unlisten = await listen<{
        downloadId: number
        abbreviation: string
        downloaded: number
        total: number | null
      }>("translation:download-progress", ({ payload }) => {
        if (
          payload.downloadId !== operation.id ||
          payload.abbreviation !== abbreviation ||
          operation.cancelRequested
        )
          return
        useTranslationDownloadStore.setState({
          progress: payload.total
            ? Math.min(
                100,
                Math.round((payload.downloaded / payload.total) * 100)
              )
            : null,
        })
      })
      if (operation.cancelRequested) return

      operation.id = await invoke("prepare_translation_download")
      if (operation.cancelRequested) {
        await invoke("cancel_translation_download", {
          downloadId: operation.id,
        })
        return
      }

      const downloaded = await invoke("download_translation", {
        abbreviation,
        downloadId: operation.id,
      })
      const bible = useBibleStore.getState()
      bible.setTranslations(
        bible.translations.map((item) =>
          item.id === downloaded.id ? downloaded : item
        )
      )
      const hidden = useSettingsStore.getState().hiddenTranslationIds
      if (!hidden.includes(downloaded.id)) {
        useSettingsStore
          .getState()
          .setHiddenTranslationIds([...hidden, downloaded.id])
      }
      try {
        useBibleStore
          .getState()
          .setTranslations(await invoke("list_translations"))
      } catch (error) {
        useTranslationDownloadStore.setState({
          error: `${abbreviation} was downloaded, but the translation list could not be refreshed: ${String(error)}`,
        })
      }
    } catch (error) {
      if (String(error) !== "Translation download cancelled") {
        console.error(`Failed to download ${abbreviation}:`, error)
        useTranslationDownloadStore.setState({
          error: error instanceof Error ? error.message : String(error),
        })
      }
    } finally {
      if (operation.cancelPromise) {
        await operation.cancelPromise.catch(() => false)
      }
      unlisten?.()
      currentOperation = null
      useTranslationDownloadStore.setState({
        abbreviation: null,
        progress: null,
        cancelling: false,
      })
    }
  },

  async cancel(): Promise<void> {
    const operation = currentOperation
    if (!operation || operation.cancelRequested) return
    operation.cancelRequested = true
    useTranslationDownloadStore.setState({ cancelling: true, error: null })
    if (operation.id === null) return

    operation.cancelPromise = invoke("cancel_translation_download", {
      downloadId: operation.id,
    })
    try {
      if (!(await operation.cancelPromise)) {
        operation.cancelRequested = false
        useTranslationDownloadStore.setState({ cancelling: false })
      }
    } catch (error) {
      operation.cancelRequested = false
      useTranslationDownloadStore.setState({
        cancelling: false,
        error: `Could not cancel download: ${String(error)}`,
      })
    }
  },
}
