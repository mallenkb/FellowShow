export interface LyricBlock {
  label: string
  text: string
}

const SECTION_RE =
  /^(verse|chorus|refrain|bridge|tag|ending|intro|outro|pre-chorus|pre chorus)(\s+\d+)?\b[:\s-]*/i
const SECTION_ONLY_RE =
  /^(verse|chorus|refrain|bridge|tag|ending|intro|outro|pre-chorus|pre chorus)(\s+\d+)?\s*:?\s*$/i
const NUMBERED_LINE_RE = /^(\d+)[.)]?\s+(.+)/
const MAX_PRESENTATION_LINES = 6
const MAX_PRESENTATION_ROWS = 8
const ESTIMATED_PRESENTATION_CHARS_PER_ROW = 34

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

  const sourceBlocks =
    paragraphs.length > 1
      ? mergeParagraphSections(paragraphs)
      : splitLineSections(normalized)

  const cleanedBlocks = sourceBlocks
    .map(({ label, text }, index) => ({
      label: label || defaultVerseLabel(index),
      text: cleanDisplayText(text),
    }))
    .filter((block) => block.text.length > 0)

  return cleanedBlocks.flatMap(splitOversizedBlock)
}

function defaultVerseLabel(index: number): string {
  return `Verse ${index + 1}`
}

function mergeParagraphSections(paragraphs: string[]): LyricBlock[] {
  const blocks: LyricBlock[] = []
  let pendingLabel: string | null = null

  for (const paragraph of paragraphs) {
    if (isMetadataBlock(paragraph, blocks.length === 0 && !pendingLabel)) {
      continue
    }

    const lines = paragraph
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
    const firstLine = lines[0] ?? ""

    if (SECTION_ONLY_RE.test(firstLine) && lines.length === 1) {
      pendingLabel = normalizeSectionLabel(firstLine)
      continue
    }

    if (SECTION_RE.test(firstLine) && lines.length > 1) {
      blocks.push({
        label: normalizeSectionLabel(firstLine),
        text: lines.slice(1).join("\n"),
      })
      pendingLabel = null
      continue
    }

    if (pendingLabel) {
      blocks.push({ label: pendingLabel, text: paragraph })
      pendingLabel = null
      continue
    }

    blocks.push(labelBlock(paragraph, blocks.length))
  }

  return blocks.length > 0
    ? blocks
    : [{ label: defaultVerseLabel(0), text: paragraphs.join("\n\n") }]
}

function splitLineSections(lyrics: string): LyricBlock[] {
  const lines = lyrics
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
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
    if (isSourceCreditLine(line) && currentLines.length > 0) continue

    if (SECTION_ONLY_RE.test(line)) {
      flush()
      currentLabel = normalizeSectionLabel(line)
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

  return blocks.length > 0 ? blocks : chunkLines(lines)
}

function chunkLines(lines: string[]): LyricBlock[] {
  const blocks: LyricBlock[] = []

  for (let i = 0; i < lines.length; i += 4) {
    blocks.push({
      label: defaultVerseLabel(blocks.length),
      text: lines.slice(i, i + 4).join("\n"),
    })
  }

  return blocks
}

function splitOversizedBlock(block: LyricBlock): LyricBlock[] {
  const lines = block.text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
  const estimatedRows = estimatePresentationRows(lines)
  if (!isOversizedPresentationBlock(lines, estimatedRows)) return [block]

  const chunks: string[][] = []
  const chunkCount = Math.max(
    2,
    Math.ceil(
      Math.max(
        lines.length / MAX_PRESENTATION_LINES,
        estimatedRows / MAX_PRESENTATION_ROWS
      )
    )
  )
  const targetLinesPerChunk = Math.ceil(lines.length / chunkCount)

  for (let i = 0; i < lines.length; i += targetLinesPerChunk) {
    chunks.push(lines.slice(i, i + targetLinesPerChunk))
  }

  if (chunks.length <= 1) return [block]

  return chunks.map((chunk) => ({
    label: block.label,
    text: chunk.join("\n"),
  }))
}

function isOversizedPresentationBlock(
  lines: string[],
  estimatedRows = estimatePresentationRows(lines)
): boolean {
  if (lines.length > MAX_PRESENTATION_LINES) return true

  return estimatedRows > MAX_PRESENTATION_ROWS
}

function estimatePresentationRows(lines: string[]): number {
  return lines.reduce((total, line) => {
    return (
      total +
      Math.max(1, Math.ceil(line.length / ESTIMATED_PRESENTATION_CHARS_PER_ROW))
    )
  }, 0)
}

function labelBlock(block: string, index: number): LyricBlock {
  const firstLine = block.split("\n").find(Boolean)?.trim() ?? ""
  const sectionMatch = firstLine.match(SECTION_RE)
  const numberedMatch = firstLine.match(NUMBERED_LINE_RE)

  if (sectionMatch) {
    return {
      label: normalizeSectionLabel(sectionMatch[0]),
      text: block.replace(SECTION_RE, "").trim(),
    }
  }

  if (numberedMatch) {
    return {
      label: `Verse ${numberedMatch[1]}`,
      text: block.replace(NUMBERED_LINE_RE, "$2").trim(),
    }
  }

  return {
    label: defaultVerseLabel(index),
    text: block,
  }
}

function normalizeSectionLabel(label: string): string {
  return label
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
  return /^([A-Z][A-Za-z'.-]*(?:\s+[A-Z][A-Za-z'.-]*){0,3},\s*)?(PH|RH|BBC songs|Blessings|Golden Bells|Living songs|P ANT)\b[.\s-]*\d*/i.test(
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
