import { useEffect, useState } from "react"
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow"
import {
  IDENTIFY_DURATION_MS,
  IDENTIFY_EVENT,
  type IdentifyLabel,
} from "@/lib/identify-screens"

/** The Identify label drawn inside a full-screen output window. */
export function IdentifyOverlay() {
  const [label, setLabel] = useState<IdentifyLabel | null>(null)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const unlisten = getCurrentWebviewWindow().listen<IdentifyLabel>(
      IDENTIFY_EVENT,
      (event) => {
        setLabel(event.payload)
        clearTimeout(timer)
        timer = setTimeout(() => setLabel(null), IDENTIFY_DURATION_MS)
      }
    )
    return () => {
      clearTimeout(timer)
      void unlisten.then((stop) => stop()).catch(console.error)
    }
  }, [])

  if (!label) return null
  return (
    <div
      role="status"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1.2vh",
          padding: "3vh 5vw",
          border: "0.6vh solid #facc15",
          background: "#111111",
          color: "#ffffff",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "9vh", fontWeight: 800, lineHeight: 1 }}>
          {label.title}
        </div>
        <div style={{ fontSize: "3.4vh", fontWeight: 600, color: "#facc15" }}>
          {label.detail}
        </div>
      </div>
    </div>
  )
}
