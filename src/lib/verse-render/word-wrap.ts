const graphemes =
  typeof Intl.Segmenter === "function"
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null

/** Break only words that cannot fit a line, keeping complete graphemes together. */
export function splitOversizedWord(
  word: string,
  maximumWidth: number,
  measure: (text: string) => number
): string[] {
  if (
    !Number.isFinite(maximumWidth) ||
    maximumWidth <= 0 ||
    measure(word) <= maximumWidth
  ) {
    return [word]
  }
  const characters = graphemes
    ? Array.from(graphemes.segment(word), (part) => part.segment)
    : Array.from(word)
  const chunks: string[] = []
  let current = ""
  for (const character of characters) {
    const candidate = current + character
    if (current && measure(candidate) > maximumWidth) {
      chunks.push(current)
      current = character
    } else {
      current = candidate
    }
  }
  if (current) chunks.push(current)
  return chunks
}
