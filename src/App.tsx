import { useEffect } from "react"
import { Dashboard } from "@/components/layout/dashboard"
import { useRemoteControl } from "@/hooks/use-remote-control"
import { TutorialOverlay } from "@/components/tutorial/tutorial-overlay"
import { Toaster } from "sonner"
import { usePresenterTimerStore } from "@/stores"
import { AppUpdater } from "@/components/app-updater"

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

export function App() {
  useRemoteControl()
  return (
    <>
      <PresenterTimerTicker />
      <AppUpdater />
      <Dashboard />
      <TutorialOverlay />
      <Toaster position="bottom-right" />
    </>
  )
}

export default App
