import { useEffect, useRef } from "react"
import { isTauri } from "@tauri-apps/api/core"
import { listen, type UnlistenFn } from "@tauri-apps/api/event"

function safelyUnlisten(event: string, unlisten: UnlistenFn): void {
  try {
    // Tauri's declaration says UnlistenFn returns void, but the runtime
    // implementation is async. Promise.resolve adopts that hidden promise so
    // cleanup races cannot become unhandled rejections.
    void Promise.resolve(unlisten()).catch((error: unknown) => {
      console.warn(`[tauri-event] failed to unlisten from ${event}:`, error)
    })
  } catch (error) {
    console.warn(`[tauri-event] failed to unlisten from ${event}:`, error)
  }
}

export function useTauriEvent<T>(event: string, handler: (payload: T) => void) {
  const handlerRef = useRef(handler)

  useEffect(() => {
    handlerRef.current = handler
  }, [handler])

  useEffect(() => {
    if (!isTauri()) return

    // Track whether this effect has been cleaned up.
    // React StrictMode unmounts/remounts effects, and the listen() Promise
    // may resolve after cleanup — the cancelled flag prevents stale listeners.
    let cancelled = false
    let unlisten: UnlistenFn | undefined

    listen<T>(event, (e) => {
      if (!cancelled) {
        handlerRef.current(e.payload)
      }
    })
      .then((fn) => {
        if (cancelled) {
          // Effect was already cleaned up before the listener registered — remove it immediately
          safelyUnlisten(event, fn)
        } else {
          unlisten = fn
        }
      })
      .catch((error) => {
        console.warn(`[tauri-event] failed to listen for ${event}:`, error)
      })

    return () => {
      cancelled = true
      if (unlisten) safelyUnlisten(event, unlisten)
      unlisten = undefined
    }
  }, [event])
}
