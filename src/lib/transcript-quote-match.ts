const MIN_QUOTE_WORDS = 4

interface WordToken {
  word: string
  start: number
  end: number
}

function tokenize(text: string): WordToken[] {
  const tokens: WordToken[] = []
  for (const match of text.matchAll(/[\p{L}\p{N}'’]+/gu)) {
    const word = match[0].toLowerCase().replace(/['’]/g, "")
    if (!word) continue
    tokens.push({
      word,
      start: match.index,
      end: match.index + match[0].length,
    })
  }
  return tokens
}

/**
 * Finds the longest run of consecutive words that the transcript shares with a
 * verse, so a spoken quotation can be marked in place. Runs shorter than
 * `minWords` are ignored because short phrases like "the Lord said" match
 * too many verses to mean anything.
 */
export function findQuotedSpan(
  text: string,
  verseText: string,
  minWords = MIN_QUOTE_WORDS
): { start: number; end: number } | null {
  const spoken = tokenize(text)
  const verse = tokenize(verseText)
  if (spoken.length < minWords || verse.length < minWords) return null

  let bestLength = 0
  let bestEnd = -1
  let previous = new Array<number>(verse.length + 1).fill(0)
  for (let i = 1; i <= spoken.length; i += 1) {
    const current = new Array<number>(verse.length + 1).fill(0)
    for (let j = 1; j <= verse.length; j += 1) {
      if (spoken[i - 1].word !== verse[j - 1].word) continue
      current[j] = previous[j - 1] + 1
      if (current[j] > bestLength) {
        bestLength = current[j]
        bestEnd = i - 1
      }
    }
    previous = current
  }

  if (bestLength < minWords) return null
  return {
    start: spoken[bestEnd - bestLength + 1].start,
    end: spoken[bestEnd].end,
  }
}
