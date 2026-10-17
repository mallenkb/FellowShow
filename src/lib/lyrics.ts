export interface LyricBlock {
  label: string
  text: string
}

const SECTION_RE =
  /^\[?(verse|chorus|refrain|bridge|tag|ending|intro|outro|pre-chorus|pre chorus|other)(\s+\d+)?\]?\s*[:-]\s*/i
const SECTION_ONLY_RE =
  /^\[?(verse|chorus|refrain|bridge|tag|ending|intro|outro|pre-chorus|pre chorus|other)(\s+\d+)?\]?\s*:?\s*$/i
const NUMBERED_LINE_RE = /^(\d+)[.)]*\s+(.+)/

export function splitLyricBlocks(lyrics: string): LyricBlock[] {
  const normalized = lyrics
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .trim()

  if (!normalized) return []

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)

  const sourceBlocks = mergeParagraphSections(paragraphs)

  const cleanedBlocks = sourceBlocks
    .map(({ label, text }, index) => ({
      label: label || defaultVerseLabel(index),
      text: cleanDisplayText(text),
    }))
    .filter((block) => block.text.length > 0)

  return cleanedBlocks
}

function defaultVerseLabel(index: number): string {
  return `Verse ${index + 1}`
}

function mergeParagraphSections(paragraphs: string[]): LyricBlock[] {
  const lyricParagraphs = paragraphs.filter(
    (paragraph, index) => !isMetadataBlock(paragraph, index === 0)
  )
  return splitLineSections(lyricParagraphs.join("\n\n"))
}

function splitLineSections(lyrics: string): LyricBlock[] {
  const lines = lyrics.split("\n").map((line) => line.trim())
  const blocks: LyricBlock[] = []
  let currentLabel: string | null = null
  let currentLines: string[] = []

  const flush = () => {
    if (currentLines.length === 0) return
    blocks.push({
      label: currentLabel ?? defaultVerseLabel(blocks.length),
      text: currentLines.join("\n"),
    })
    currentLabel = null
    currentLines = []
  }

  for (const line of lines) {
    if (!line) {
      flush()
      continue
    }
    if (isSourceCreditLine(line) && currentLines.length > 0) continue

    if (SECTION_ONLY_RE.test(line)) {
      flush()
      currentLabel = normalizeSectionLabel(line)
      continue
    }

    const section = line.match(SECTION_RE)
    if (section) {
      flush()
      currentLabel = normalizeSectionLabel(section[0])
      const inlineText = line.slice(section[0].length).trim()
      if (inlineText) currentLines.push(inlineText)
      continue
    }

    const numbered = line.match(NUMBERED_LINE_RE)
    if (numbered) {
      flush()
      currentLabel = `Verse ${numbered[1]}`
      currentLines.push(numbered[2])
      continue
    }

    currentLines.push(line)
  }

  flush()

  return blocks
}

function normalizeSectionLabel(label: string): string {
  return label
    .replace(/[[\]]/g, "")
    .replace(/[:\s-]+$/, "")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function cleanDisplayText(text: string): string {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => !SECTION_ONLY_RE.test(line))
    .filter((line) => !isMetadataLine(line))

  return lines
    .filter((line, index) => !isLikelyCreditLine(line, index, lines))
    .join("\n")
    .trim()
}

function isMetadataBlock(block: string, isFirstBlock: boolean): boolean {
  if (!isFirstBlock) return false
  const lines = block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
  if (lines.length === 0 || lines.length > 4) return false
  return lines.every(
    (line) =>
      /^\[?key:/i.test(line) ||
      /version$/i.test(line) ||
      /^[1-3]?\s?[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s+\d+:\d+/.test(line)
  )
}

function isSourceCreditLine(line: string): boolean {
  return /^([A-Z][A-Za-z'.-]*(?:\s+[A-Z][A-Za-z'.-]*){0,3},\s*)?(PH|RH|BBC songs|Blessings|Golden Bells|Living songs|P\s*AN\s*T|PAN\s*\([TF]\))[.\s-]*\d+/i.test(
    line
  )
}

function isMetadataLine(line: string): boolean {
  return /^\[?key:/i.test(line) || isSourceCreditLine(line)
}

function isLikelyCreditLine(
  line: string,
  index: number,
  lines: string[]
): boolean {
  if (index !== 0 && index !== lines.length - 1) return false
  if (line.length > 70 || !/\b(and|&)\b/i.test(line)) return false
  if (/[.!?;:]$/.test(line)) return false
  if (!/^[A-Z][A-Za-z' .-]+(?:\s+(?:and|&)\s+[A-Z][A-Za-z' .-]+)+$/.test(line))
    return false

  const lyricLines = lines.filter(
    (candidate) => !isMetadataLine(candidate) && candidate !== line
  )
  return lyricLines.length > 0
}

/** Keep authored lyric line breaks and spacing identical on every output. */
export function lyricDisplayLines(text: string): string[] {
  return text.replace(/\r\n?/g, "\n").split("\n")
}
