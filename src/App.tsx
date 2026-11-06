import { lazy, Suspense, useEffect, useState } from "react"
import { Dashboard } from "@/components/layout/dashboard"
import { useRemoteControl } from "@/hooks/use-remote-control"
import { useTauriEvent } from "@/hooks/use-tauri-event"
import { Toaster } from "sonner"
import { useBroadcastStore } from "@/stores"
import AppUpdater from "@/components/app-updater"
import { SermonSessionDialog } from "@/components/controls/sermon-session-dialog"
import { SermonDeleteDialog } from "@/components/controls/sermon-delete-dialog"
import { StartScreen } from "@/components/home/start-screen"
import { useAppNavigationStore } from "@/stores/app-navigation-store"

const TutorialOverlay = lazy(() =>
  import("@/components/tutorial/tutorial-overlay").then((module) => ({
    default: module.TutorialOverlay,
  }))
)

function BroadcastOutputSync() {
  // Broadcast windows announce themselves once their webview finishes loading,
  // which on Windows (WebView2) can be well after the window was opened. Push
  // the current program state so they never sit on the default background
  // waiting for the next content change. Registered app-wide: the window may
  // finish loading after the broadcast settings dialog has closed.
  useTauriEvent("broadcast:output-ready", () => {
    useBroadcastStore.getState().syncBroadcastOutput()
    // Re-sync once more after fonts/media in the output window settle.
    setTimeout(() => useBroadcastStore.getState().syncBroadcastOutput(), 300)
  })

  return null
}

function App() {
  useRemoteControl()
  const [tutorialReady, setTutorialReady] = useState(false)
  const home = useAppNavigationStore((state) => state.screen === "home")

  useEffect(() => {
    const timer = window.setTimeout(() => setTutorialReady(true), 250)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <>
      <BroadcastOutputSync />
      <AppUpdater />
      <SermonSessionDialog />
      <SermonDeleteDialog />
      {/* Keep transcription subscriptions and unfinished workspace edits mounted. */}
      <div hidden={home} inert={home}>
        <Dashboard />
      </div>
      {home ? <StartScreen /> : null}
      {tutorialReady && !home ? (
        <Suspense fallback={null}>
          <TutorialOverlay />
        </Suspense>
      ) : null}
      <Toaster position="bottom-right" />
    </>
  )
}

export default App
