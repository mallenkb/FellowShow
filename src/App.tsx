import { lazy, Suspense, useEffect, useState } from "react"
import { Dashboard } from "@/components/layout/dashboard"
import { useRemoteControl } from "@/hooks/use-remote-control"
import { useTauriEvent } from "@/hooks/use-tauri-event"
import { Toaster } from "sonner"
import { useBroadcastStore, usePresenterTimerStore } from "@/stores"
import AppUpdater from "@/components/app-updater"

const TutorialOverlay = lazy(() =>
  import("@/components/tutorial/tutorial-overlay").then((module) => ({
    default: module.TutorialOverlay,
  }))
)

function PresenterTimerTicker() {
  const isRunning = usePresenterTimerStore((s) => s.isRunning)
  const tick = usePresenterTimerStore((s) => s.tick)

  useEffect(() => {
    if (!isRunning) return

    const interval = window.setInterval(() => tick(), 1000)
    return () => window.clearInterval(interval)
  }, [isRunning, tick])

  return null
}

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

  useEffect(() => {
    const timer = window.setTimeout(() => setTutorialReady(true), 250)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <>
      <PresenterTimerTicker />
      <BroadcastOutputSync />
      <AppUpdater />
      <Dashboard />
      {tutorialReady ? (
        <Suspense fallback={null}>
          <TutorialOverlay />
        </Suspense>
      ) : null}
      <Toaster position="bottom-right" />
    </>
  )
}

export default App
