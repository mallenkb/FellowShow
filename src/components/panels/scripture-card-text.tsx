import { useEffect, useRef, useState } from "react"
import { useBibleStore } from "@/stores/bible-store"
import { fetchScripturePassage } from "./sermon-scripture-actions"

const TEXT_CLASS = "mt-2 block text-xs leading-relaxed text-foreground/85"

interface PassageReference {
  bookNumber: number
  chapter: number
  verse: number
  verseEnd?: number | null
}

function MissingScriptureText({
  bookNumber,
  chapter,
  verse,
  verseEnd,
  className,
}: PassageReference & { className: string }) {
  const translationId = useBibleStore((state) => state.activeTranslationId)
  const textRef = useRef<HTMLSpanElement>(null)
  const requestKey = `${translationId}:${bookNumber}:${chapter}:${verse}:${verseEnd ?? ""}`
  const [loaded, setLoaded] = useState<{ key: string; text: string | null }>()

  useEffect(() => {
    const element = textRef.current
    if (!element || translationId <= 0) return
    let cancelled = false
    const load = () => {
      void fetchScripturePassage(
        bookNumber,
        chapter,
        verse,
        verseEnd,
        translationId
      )
        .then((passage) => {
          if (!cancelled)
            setLoaded({ key: requestKey, text: passage?.text.trim() || null })
        })
        .catch((error: unknown) => {
          if (cancelled) return
          console.error("[scripture-card] Could not load passage", error)
          setLoaded({ key: requestKey, text: null })
        })
    }
    if (typeof IntersectionObserver === "undefined") {
      load()
      return () => {
        cancelled = true
      }
    }
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      observer.disconnect()
      load()
    })
    observer.observe(element)
    return () => {
      cancelled = true
      observer.disconnect()
    }
  }, [bookNumber, chapter, verse, verseEnd, translationId, requestKey])

  const text =
    translationId <= 0
      ? "Select a Bible version to see the verse."
      : loaded?.key === requestKey
        ? (loaded.text ?? "Verse unavailable in this Bible version.")
        : "Loading verse…"

  return (
    <span ref={textRef} className={className}>
      {text}
    </span>
  )
}

export function ScriptureCardText({
  text,
  className = TEXT_CLASS,
  ...reference
}: PassageReference & { text: string; className?: string }) {
  return text.trim() ? (
    <span className={className}>{text}</span>
  ) : (
    <MissingScriptureText {...reference} className={className} />
  )
}
