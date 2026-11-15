import { isTauri } from "@tauri-apps/api/core"
import { getCurrentWindow } from "@tauri-apps/api/window"

type IconTheme = "light" | "dark"

export function appIconPath(theme: IconTheme) {
  return `/fellowshow-${theme}.png`
}

let windowIconUpdate = Promise.resolve()

export function syncAppIcon(theme: IconTheme) {
  const iconPath = appIconPath(theme)
  const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (favicon) favicon.href = iconPath

  if (!isTauri() || !/^(Win|Linux)/.test(navigator.platform)) return

  const window = getCurrentWindow()
  if (window.label !== "main") return

  const root = document.documentElement
  windowIconUpdate = windowIconUpdate
    .then(async () => {
      if (!root.classList.contains(theme)) return
      const response = await fetch(iconPath)
      if (!response.ok)
        throw new Error(`Icon request failed (${response.status})`)
      const bytes = Array.from(new Uint8Array(await response.arrayBuffer()))
      if (root.classList.contains(theme)) await window.setIcon(bytes)
    })
    .catch((error: unknown) => {
      console.warn("[appearance] Could not update the window icon", error)
    })
}
