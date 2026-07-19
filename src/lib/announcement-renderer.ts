import type { AnnouncementMark, BroadcastTheme, VerseRenderData } from "@/types"

function fontForMarks(
  theme: BroadcastTheme,
  marks: AnnouncementMark[]
): string {
  const italic = marks.includes("italic") ? "italic " : ""
  const weight = marks.includes("bold")
    ? Math.max(700, theme.verseText.fontWeight)
    : theme.verseText.fontWeight
  return `${italic}${weight} ${theme.verseText.fontSize}px ${theme.verseText.fontFamily}`
}

interface Token {
  text: string
  marks: AnnouncementMark[]
}

function tokensForRuns(
  runs: Array<{ text: string; marks: AnnouncementMark[] }>
): Token[] {
  return runs.flatMap((run) =>
    run.text
      .split(/(\s+)/)
      .filter(Boolean)
      .map((text) => ({ text, marks: run.marks }))
  )
}

function drawToken(
  ctx: CanvasRenderingContext2D,
  theme: BroadcastTheme,
  token: Token,
  x: number,
  baseline: number
): number {
  ctx.font = fontForMarks(theme, token.marks)
  ctx.fillStyle = theme.verseText.color
  const width = ctx.measureText(token.text).width
  ctx.fillText(token.text, x, baseline)
  if (token.marks.includes("underline") && token.text.trim()) {
    ctx.save()
    ctx.strokeStyle = theme.verseText.color
    ctx.lineWidth = Math.max(1, theme.verseText.fontSize * 0.045)
    ctx.beginPath()
    ctx.moveTo(x, baseline + theme.verseText.fontSize * 0.12)
    ctx.lineTo(x + width, baseline + theme.verseText.fontSize * 0.12)
    ctx.stroke()
    ctx.restore()
  }
  return width
}

function renderAnnouncementBody(
  ctx: CanvasRenderingContext2D,
  theme: BroadcastTheme,
  verse: VerseRenderData,
  x: number,
  width: number,
  startY: number,
  shouldDraw: boolean
): number {
  if (!verse.announcement) return 0
  const announcement = verse.announcement

  const lineHeight = theme.verseText.fontSize * theme.verseText.lineHeight
  const blockGap = lineHeight * 0.35
  const paragraphToListGap = lineHeight * 0.65
  const itemGap = lineHeight * 0.45
  const indent = theme.verseText.fontSize * 0.8
  let y = startY + theme.verseText.fontSize

  ctx.save()
  ctx.textAlign = "left"
  ctx.textBaseline = "alphabetic"

  announcement.items.forEach((item, itemIndex) => {
    let numberedListIndex = 0
    item.blocks.forEach((block, blockIndex) => {
      const isList = block.kind !== "paragraph"
      const prefix =
        block.kind === "bullet"
          ? "• "
          : block.kind === "number"
            ? `${++numberedListIndex}. `
            : ""
      const lineStart = x + (isList ? indent : 0)
      let cursorX = lineStart
      if (prefix) {
        const prefixToken = {
          text: prefix,
          marks: ["bold"] as AnnouncementMark[],
        }
        ctx.font = fontForMarks(theme, prefixToken.marks)
        cursorX += shouldDraw
          ? drawToken(ctx, theme, prefixToken, cursorX, y)
          : ctx.measureText(prefix).width
      }
      for (const token of tokensForRuns(block.runs)) {
        if (token.text.includes("\n")) {
          y += lineHeight
          cursorX = lineStart
          continue
        }
        ctx.font = fontForMarks(theme, token.marks)
        const tokenWidth = ctx.measureText(token.text).width
        if (cursorX > lineStart && cursorX + tokenWidth > x + width) {
          y += lineHeight
          cursorX = lineStart
          if (!token.text.trim()) continue
        }
        if (shouldDraw) drawToken(ctx, theme, token, cursorX, y)
        cursorX += tokenWidth
      }
      const nextBlock = item.blocks[blockIndex + 1]
      const gap =
        block.kind === "paragraph" && nextBlock?.kind !== "paragraph"
          ? paragraphToListGap
          : blockGap
      y += lineHeight + gap
    })
    if (itemIndex < announcement.items.length - 1) y += itemGap
  })

  ctx.restore()
  return y - startY
}

export function drawAnnouncement(
  ctx: CanvasRenderingContext2D,
  theme: BroadcastTheme,
  verse: VerseRenderData,
  x: number,
  width: number,
  startY: number,
  maxHeight?: number
): number {
  if (!verse.announcement) return 0

  let fittedTheme = theme
  if (maxHeight && maxHeight > 0) {
    const preferredSize = theme.verseText.fontSize
    let low = Math.min(30, preferredSize)
    let high = preferredSize
    while (high - low > 1) {
      const candidate = Math.floor((low + high) / 2)
      const candidateTheme = {
        ...theme,
        verseText: { ...theme.verseText, fontSize: candidate },
      }
      const height = renderAnnouncementBody(
        ctx,
        candidateTheme,
        verse,
        0,
        width,
        0,
        false
      )
      if (height <= maxHeight) low = candidate
      else high = candidate
    }
    const fittedSize =
      renderAnnouncementBody(ctx, theme, verse, 0, width, 0, false) <= maxHeight
        ? preferredSize
        : low
    fittedTheme = {
      ...theme,
      verseText: { ...theme.verseText, fontSize: fittedSize },
    }
  }

  return renderAnnouncementBody(ctx, fittedTheme, verse, x, width, startY, true)
}
