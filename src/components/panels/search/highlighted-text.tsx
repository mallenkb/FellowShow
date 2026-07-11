export function HighlightedText({
  text,
  query,
}: {
  text: string
  query: string
}) {
  if (!query || query.length < 2) return <>{text}</>

  const queryWords = new Set(
    query
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length >= 2)
  )
  if (queryWords.size === 0) return <>{text}</>

  // Split text into words while preserving whitespace/punctuation
  const parts = text.split(/(\s+)/)
  return (
    <>
      {parts.map((part, i) => {
        const cleaned = part.toLowerCase().replace(/[^a-z']/g, "")
        if (cleaned.length >= 2 && queryWords.has(cleaned)) {
          return (
            <mark
              key={i}
              className="rounded-[2px] bg-foreground/20 px-0.5 text-black text-foreground dark:bg-[#F1E600]/90 dark:text-black"
            >
              {part}
            </mark>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}
