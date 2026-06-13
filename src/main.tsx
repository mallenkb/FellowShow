import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { invoke } from "@tauri-apps/api/core"

import "./index.css"
import App from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { TooltipProvider } from "@/components/ui/tooltip.tsx"
import { hydrateSettings } from "@/stores/settings-store"
import { hydrateBibleStore, initBiblePersistence } from "@/stores/bible-store"
import { hydrateBroadcastThemes } from "@/stores/broadcast-store"
import {
  initTranscriptPersistence,
  resetTranscriptSession,
} from "@/stores/transcript-store"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark">
      <TooltipProvider>
        <App />
      </TooltipProvider>
    </ThemeProvider>
  </StrictMode>
)

// Webview reloads do NOT restart the Rust backend, so any STT pipeline
// left running from the previous webview session still has
// `stt_active = true`. That makes the next `start_transcription` call
// fail silently with "Transcription is already running". Reset the
// backend and transcript UI to a clean state on boot, then hydrate
// persisted settings and bible store without blocking the first paint.
void invoke("stop_transcription")
  .catch(() => {})
  .then(() =>
    Promise.all([
      hydrateSettings(),
      hydrateBibleStore(),
      hydrateBroadcastThemes(),
      resetTranscriptSession(),
    ])
  )
  .then(() =>
    Promise.all([initBiblePersistence(), initTranscriptPersistence()])
  )
  .catch((error) => {
    console.error("Failed to hydrate app state", error)
  })
