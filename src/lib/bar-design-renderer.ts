import { BAR_ENTRANCE_MS, BAR_TEXT_FADE_MS } from "./overlays"
import type { BroadcastOverlayPayload } from "@/types"
import type { BarDesign } from "@/types/bar-designs"

type Bar = NonNullable<BroadcastOverlayPayload["bar"]>

interface TextStyle {
  /** Size in hundredths of the output width, like CSS cqw. */
  size: number
  weight: number
  line: number
  family?: "serif" | "condensed"
  italic?: boolean
  uppercase?: boolean
  smallCaps?: boolean
  /** Letter spacing in em. */
  spacing?: number
}

interface BarDesignSpec {
  surface: "fill" | "glass" | "fade"
  topLine?: number
  header:
    | "rule"
    | "kicker"
    | "footer-center"
    | "footer-right"
    | "strip"
    | "pill"
    | "label"
    | "inline"
    | "none"
  side?: "tab" | "block" | "panel" | "rail" | "column"
  body: TextStyle
  center?: boolean
  innerBox?: boolean
  dropCap?: boolean
  marker?: boolean
  verseLines?: boolean
  fixedSize?: boolean
}

/** Values transcribed from the FellowShow Bar Designs board, 01 through 15. */
const SPECS: Record<BarDesign, BarDesignSpec> = {
  "classic-split": {
    surface: "fill",
    header: "rule",
    innerBox: true,
    body: { size: 2.4, weight: 500, line: 1.45 },
  },
  "newsroom-tab": {
    surface: "fill",
    topLine: 0.35,
    header: "kicker",
    side: "tab",
    body: { size: 2.3, weight: 500, line: 1.4 },
  },
  "smoked-glass": {
    surface: "glass",
    topLine: 0.12,
    header: "kicker",
    body: { size: 2.7, weight: 300, line: 1.42 },
  },
  "ivory-serif": {
    surface: "fill",
    topLine: 0.45,
    header: "footer-right",
    body: { size: 2.8, weight: 400, line: 1.35, family: "serif", italic: true },
  },
  "gold-rule": {
    surface: "fade",
    header: "footer-center",
    center: true,
    body: { size: 2.7, weight: 400, line: 1.42, family: "serif" },
  },
  "two-tier": {
    surface: "fill",
    header: "strip",
    body: { size: 2.4, weight: 500, line: 1.45 },
  },
  "chapter-block": {
    surface: "fill",
    header: "kicker",
    side: "block",
    body: { size: 2.3, weight: 500, line: 1.45 },
  },
  sunrise: {
    surface: "fill",
    header: "pill",
    body: { size: 2.6, weight: 600, line: 1.35 },
  },
  "frosted-light": {
    surface: "glass",
    header: "inline",
    body: { size: 2.6, weight: 400, line: 1.42, family: "serif" },
  },
  "split-panel": {
    surface: "fill",
    topLine: 0.3,
    header: "none",
    side: "panel",
    body: { size: 2.35, weight: 500, line: 1.45 },
  },
  "verse-rail": {
    surface: "fill",
    topLine: 0.3,
    header: "none",
    side: "rail",
    verseLines: true,
    body: { size: 2.25, weight: 500, line: 1.4 },
  },
  parchment: {
    surface: "fill",
    topLine: 0.35,
    header: "kicker",
    dropCap: true,
    body: { size: 2.5, weight: 400, line: 1.45, family: "serif" },
  },
  "two-column": {
    surface: "fill",
    topLine: 0.3,
    header: "none",
    side: "column",
    body: { size: 2.1, weight: 500, line: 1.45 },
  },
  marker: {
    surface: "fill",
    topLine: 0.35,
    header: "label",
    marker: true,
    body: { size: 2.65, weight: 500, line: 1.45 },
  },
  "large-text": {
    surface: "fill",
    topLine: 0.25,
    header: "inline",
    fixedSize: true,
    body: { size: 3, weight: 600, line: 1.4 },
  },
}

const MAX_LINES = 4

function fontFor(style: TextStyle, unit: number, sizeFactor = 1): string {
  const family =
    style.family === "serif"
      ? '"Fraunces Variable", Georgia, serif'
      : style.family === "condensed"
        ? '"Barlow Condensed", "Inter Variable", sans-serif'
        : '"Inter Variable", sans-serif'
  return `${style.italic ? "italic " : ""}${style.smallCaps ? "small-caps " : ""}${style.weight} ${style.size * unit * sizeFactor}px ${family}`
}

function applyFont(
  ctx: CanvasRenderingContext2D,
  style: TextStyle,
  unit: number,
  sizeFactor = 1
): void {
  ctx.font = fontFor(style, unit, sizeFactor)
  ctx.letterSpacing = `${(style.spacing ?? 0) * style.size * unit * sizeFactor}px`
}

function measure(
  ctx: CanvasRenderingContext2D,
  text: string,
  style: TextStyle,
  unit: number
): number {
  applyFont(ctx, style, unit)
  return ctx.measureText(style.uppercase ? text.toUpperCase() : text).width
}

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  style: TextStyle,
  unit: number,
  x: number,
  top: number,
  color: string,
  align: CanvasTextAlign = "left"
): void {
  applyFont(ctx, style, unit)
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.textBaseline = "middle"
  ctx.fillText(
    style.uppercase ? text.toUpperCase() : text,
    x,
    top + (style.size * unit * style.line) / 2
  )
}

/** Wraps words to widths that may differ per line (for drop caps). */
function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  widthFor: (line: number) => number
): string[] {
  const lines: string[] = []
  let line = ""
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word
    if (!line || ctx.measureText(candidate).width <= widthFor(lines.length)) {
      line = candidate
      continue
    }
    lines.push(line)
    line = word
  }
  if (line) lines.push(line)
  return lines
}

function truncate(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  max: number,
  width: number
): string[] {
  if (lines.length <= max) return lines
  const kept = lines.slice(0, max)
  let last = kept[max - 1] ?? ""
  while (last && ctx.measureText(`${last}…`).width > width) {
    last = last.slice(0, -1)
  }
  kept[max - 1] = `${last.trimEnd()}…`
  return kept
}

function luminance(hex: string): number {
  const value = /^#([0-9a-f]{6})$/i.exec(hex)?.[1]
  if (!value) return 0
  const channel = (offset: number) => {
    const c = parseInt(value.slice(offset, offset + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4)
}

/** Readable ink for text drawn on an accent-filled shape. */
function inkOn(fill: string): string {
  return luminance(fill) > 0.45 ? "#111111" : "#ffffff"
}

function splitReference(heading: string): { book: string; place: string } {
  const match = /^(.*?)\s+(\d+(?:[:.]\d+(?:[-–]\d+)?)?)$/.exec(heading.trim())
  return match
    ? { book: match[1] ?? heading, place: match[2] ?? "" }
    : { book: heading, place: "" }
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  const ratio = image.naturalWidth / image.naturalHeight
  const target = width / height
  let sx = 0
  let sy = 0
  let sw = image.naturalWidth
  let sh = image.naturalHeight
  if (ratio > target) {
    sw = sh * target
    sx = (image.naturalWidth - sw) / 2
  } else {
    sh = sw / target
    sy = (image.naturalHeight - sh) / 2
  }
  ctx.drawImage(image, sx, sy, sw, sh, x, y, width, height)
}

function paintSurface(
  ctx: CanvasRenderingContext2D,
  bar: Bar,
  spec: BarDesignSpec,
  x: number,
  y: number,
  width: number,
  height: number,
  fadeHeight: number,
  imageCache: Map<string, HTMLImageElement> | undefined
): void {
  if (spec.surface === "fade") {
    const gradient = ctx.createLinearGradient(0, y, 0, y + height)
    gradient.addColorStop(0, `${bar.backgroundColor}00`)
    gradient.addColorStop(
      Math.min(0.95, fadeHeight / height + 0.05),
      `${bar.backgroundColor}d6`
    )
    gradient.addColorStop(1, `${bar.backgroundColor}f2`)
    ctx.fillStyle = gradient
    ctx.fillRect(x, y, width, height)
    return
  }
  ctx.save()
  if (spec.surface === "glass") ctx.globalAlpha *= 0.82
  const image =
    bar.backgroundType === "image" && bar.backgroundImageUrl
      ? imageCache?.get(bar.backgroundImageUrl)
      : undefined
  if (image && image.naturalWidth > 0 && image.naturalHeight > 0) {
    drawCover(ctx, image, x, y, width, height)
    ctx.fillStyle = `rgba(0, 0, 0, ${bar.backgroundDimPercent / 100})`
    ctx.fillRect(x, y, width, height)
  } else if (bar.backgroundType === "gradient") {
    const gradient = ctx.createLinearGradient(x, y, x + width, y + height)
    gradient.addColorStop(0, bar.backgroundColor)
    gradient.addColorStop(1, bar.backgroundColorEnd)
    ctx.fillStyle = gradient
    ctx.fillRect(x, y, width, height)
  } else {
    ctx.fillStyle = bar.backgroundColor
    ctx.fillRect(x, y, width, height)
  }
  ctx.restore()
}

interface SideLayout {
  width: number
  height: number
  draw: (x: number, y: number, height: number) => void
}

function layoutSide(
  ctx: CanvasRenderingContext2D,
  bar: Bar,
  spec: BarDesignSpec,
  unit: number
): SideLayout | null {
  const heading = bar.heading.trim()
  if (!spec.side || !heading) return null
  const { book, place } = splitReference(heading)
  const badge = bar.badge?.trim() ?? ""
  const accent = bar.accentColor
  const ink = inkOn(accent)
  const clamp = (value: number, min: number, max: number) =>
    Math.min(max * unit, Math.max(min * unit, value))

  if (spec.side === "tab") {
    const small: TextStyle = {
      size: 2,
      weight: 600,
      line: 1.3,
      family: "condensed",
      uppercase: true,
      spacing: 0.08,
    }
    const big: TextStyle = {
      size: place ? 5 : 3.6,
      weight: 700,
      line: 1,
      family: "condensed",
      uppercase: true,
    }
    const topText = place ? book : badge
    const mainText = place || book
    const width = clamp(
      Math.max(
        measure(ctx, topText, small, unit),
        measure(ctx, mainText, big, unit)
      ) +
        4.8 * unit,
      16,
      32
    )
    const height =
      (topText ? small.size * small.line : 0) * unit +
      big.size * big.line * unit +
      2.8 * unit
    return {
      width,
      height,
      draw: (x, y, h) => {
        ctx.fillStyle = accent
        ctx.fillRect(x, y, width, h)
        let top = y + (h - height) / 2 + 1.4 * unit
        if (topText) {
          drawText(ctx, topText, small, unit, x + 2.4 * unit, top, ink)
          top += small.size * small.line * unit
        }
        drawText(ctx, mainText, big, unit, x + 2.4 * unit, top, ink)
      },
    }
  }
  if (spec.side === "block") {
    const big: TextStyle = {
      size: 5.6,
      weight: 700,
      line: 0.95,
      family: "condensed",
      uppercase: true,
    }
    const small: TextStyle = {
      size: 1.7,
      weight: 600,
      line: 1.3,
      uppercase: true,
      spacing: 0.08,
    }
    const abbreviation = book.replace(/[^\p{L}\p{N}]/gu, "").slice(0, 3)
    const width = clamp(
      Math.max(
        measure(ctx, abbreviation, big, unit),
        measure(ctx, place, small, unit)
      ) +
        5.2 * unit,
      14,
      24
    )
    const height =
      big.size * big.line * unit +
      (place ? small.size * small.line * unit : 0) +
      2.8 * unit
    return {
      width,
      height,
      draw: (x, y, h) => {
        ctx.fillStyle = accent
        ctx.fillRect(x, y, width, h)
        let top = y + (h - height) / 2 + 1.4 * unit
        drawText(
          ctx,
          abbreviation,
          big,
          unit,
          x + width / 2,
          top,
          ink,
          "center"
        )
        top += big.size * big.line * unit
        if (place)
          drawText(ctx, place, small, unit, x + width / 2, top, ink, "center")
      },
    }
  }
  if (spec.side === "panel") {
    const small: TextStyle = {
      size: 1.5,
      weight: 600,
      line: 1.3,
      uppercase: true,
      spacing: 0.2,
    }
    const big: TextStyle = {
      size: place ? 5.2 : 3.4,
      weight: 600,
      line: 1.05,
      family: "serif",
    }
    const tiny: TextStyle = {
      size: 1.15,
      weight: 600,
      line: 1.4,
      uppercase: true,
      spacing: 0.16,
    }
    const topText = place ? book : ""
    const mainText = place || book
    const angle = 3.6 * unit
    const width = clamp(
      Math.max(
        measure(ctx, topText, small, unit),
        measure(ctx, mainText, big, unit),
        measure(ctx, badge, tiny, unit)
      ) +
        8.8 * unit,
      21,
      34
    )
    const height =
      (topText ? small.size * small.line * unit : 0) +
      big.size * big.line * unit +
      (badge ? tiny.size * tiny.line * unit + 0.5 * unit : 0) +
      3.8 * unit
    return {
      width,
      height,
      draw: (x, y, h) => {
        ctx.fillStyle = accent
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + width, y)
        ctx.lineTo(x + width - angle, y + h)
        ctx.lineTo(x, y + h)
        ctx.closePath()
        ctx.fill()
        let top = y + (h - height) / 2 + 1.9 * unit
        const left = x + 2.8 * unit
        if (topText) {
          ctx.globalAlpha *= 0.85
          drawText(ctx, topText, small, unit, left, top, ink)
          ctx.globalAlpha /= 0.85
          top += small.size * small.line * unit
        }
        drawText(ctx, mainText, big, unit, left, top, ink)
        top += big.size * big.line * unit + 0.5 * unit
        if (badge) {
          ctx.globalAlpha *= 0.7
          drawText(ctx, badge, tiny, unit, left, top, ink)
          ctx.globalAlpha /= 0.7
        }
      },
    }
  }
  // Rail and column both stack the heading over the badge.
  const title: TextStyle = {
    size: spec.side === "rail" ? 2.6 : 2.4,
    weight: 700,
    line: 1.15,
  }
  const sub: TextStyle = {
    size: 1.25,
    weight: 600,
    line: 1.4,
    uppercase: true,
    spacing: 0.14,
  }
  const width = clamp(
    Math.max(
      measure(ctx, heading, title, unit),
      measure(ctx, badge, sub, unit)
    ) +
      4.8 * unit,
    16,
    30
  )
  const height =
    title.size * title.line * unit +
    (badge ? sub.size * sub.line * unit + 0.3 * unit : 0) +
    3.2 * unit
  return {
    width,
    height,
    draw: (x, y, h) => {
      if (spec.side === "rail") {
        ctx.fillStyle =
          luminance(bar.backgroundColor) > 0.45
            ? "rgba(0,0,0,0.06)"
            : "rgba(255,255,255,0.06)"
        ctx.fillRect(x, y, width, h)
      } else {
        ctx.fillStyle = `${bar.textColor}33`
        ctx.fillRect(
          x + width - 0.12 * unit,
          y + 1.4 * unit,
          0.12 * unit,
          h - 2.8 * unit
        )
      }
      let top = y + (h - height) / 2 + 1.6 * unit
      drawText(
        ctx,
        heading,
        title,
        unit,
        x + 2.4 * unit,
        top,
        spec.side === "column" ? accent : bar.textColor
      )
      top += title.size * title.line * unit + 0.3 * unit
      if (badge) {
        ctx.globalAlpha *= 0.65
        drawText(ctx, badge, sub, unit, x + 2.4 * unit, top, bar.textColor)
        ctx.globalAlpha /= 0.65
      }
    },
  }
}

const SUPERSCRIPT_DIGITS = "⁰¹²³⁴⁵⁶⁷⁸⁹"

function superscript(value: number): string {
  return String(value)
    .split("")
    .map((digit) => SUPERSCRIPT_DIGITS[Number(digit)] ?? digit)
    .join("")
}

/** Draws one of the fifteen bar designs flush with the bottom of the output. */
export function drawBarDesign(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  bar: Bar,
  options: {
    now?: number
    scale?: number
    offsetX?: number
    offsetY?: number
    imageCache?: Map<string, HTMLImageElement>
  }
): void {
  const spec = SPECS[bar.design] ?? SPECS["classic-split"]
  const unit = width / 100
  const offsetX = options.offsetX ?? 0
  const offsetY = options.offsetY ?? 0
  const now = options.now ?? Date.now()
  const padded = bar.padding === "padded"
  const padX = (padded ? 2.8 : 2.2) * unit
  const padTop = (padded ? 1.6 : 1.2) * unit
  const padBottom = (padded ? 1.9 : 1.4) * unit
  const heading = bar.heading.trim()
  const badge = bar.badge?.trim() ?? ""
  const accent = bar.accentColor
  const segments = bar.segments ?? []

  const side = layoutSide(ctx, bar, spec, unit)
  const header = side && spec.header === "none" ? "none" : spec.header
  const mainX = offsetX + (side ? side.width : 0) + padX
  const mainWidth = Math.max(unit, width - (side ? side.width : 0) - padX * 2)

  // Header text, drawn above or below the body depending on the design.
  const kickerStyle: TextStyle = {
    size: 1.45,
    weight: 600,
    line: 1.4,
    uppercase: true,
    spacing: 0.2,
  }
  const headerTextFor = () => {
    if (spec.header === "kicker" && side) return badge
    return [heading, badge].filter(Boolean).join(" · ")
  }
  const headerText = headerTextFor()
  const headerHeights: Record<BarDesignSpec["header"], number> = {
    rule: 4.4,
    kicker: 2.6,
    "footer-center": 0,
    "footer-right": 0,
    strip: 3.3,
    pill: 3.6,
    label: 3.4,
    inline: 3.1,
    none: 0,
  }
  const topHeader = headerText ? headerHeights[header] * unit : 0
  const footerHeight =
    headerText && (header === "footer-center" || header === "footer-right")
      ? 3 * unit
      : 0

  // Body text: verse numbers inline, or one line per verse on the rail.
  // Stars mark highlights in the Marker design and are never shown.
  const plain = bar.text.replace(/\*/g, "").trim()
  const paragraphs: { number?: number; text: string }[] =
    spec.verseLines && segments.length > 1
      ? segments.map((segment) => ({
          number: segment.verseNumber,
          text: segment.text.trim(),
        }))
      : [
          {
            text:
              segments.length > 1
                ? segments
                    .map((segment) =>
                      segment.verseNumber === undefined
                        ? segment.text.trim()
                        : `${superscript(segment.verseNumber)}\u2009${segment.text.trim()}`
                    )
                    .join(" ")
                : plain,
          },
        ]
  const innerPad = spec.innerBox && padded ? 1.2 * unit : 0
  const numberColumn = spec.verseLines && paragraphs.length > 1 ? 3.6 * unit : 0
  const textWidth = Math.max(unit, mainWidth - innerPad * 2 - numberColumn)
  let factor = 1
  let lines: { number?: number; text: string; first: boolean }[] = []
  let capWidth = 0
  for (;;) {
    applyFont(ctx, spec.body, unit, factor)
    capWidth = spec.dropCap ? spec.body.size * unit * factor * 2.25 : 0
    lines = []
    for (const paragraph of paragraphs) {
      const text = spec.dropCap ? paragraph.text.slice(1) : paragraph.text
      const wrapped = wrap(ctx, text, (index) =>
        spec.dropCap && lines.length + index < 2
          ? textWidth - capWidth
          : textWidth
      )
      wrapped.forEach((line, index) =>
        lines.push({
          number: index === 0 ? paragraph.number : undefined,
          text: line,
          first: index === 0,
        })
      )
    }
    if (spec.fixedSize || lines.length <= MAX_LINES || factor <= 0.66) break
    factor -= 0.06
  }
  const maxLines = spec.fixedSize ? 3 : MAX_LINES
  if (lines.length > maxLines) {
    const kept = truncate(
      ctx,
      lines.map((line) => line.text),
      maxLines,
      textWidth
    )
    lines = lines
      .slice(0, maxLines)
      .map((line, index) => ({ ...line, text: kept[index] ?? line.text }))
  }
  const lineHeight = spec.body.size * unit * factor * spec.body.line
  const bodyHeight = lines.length * lineHeight + innerPad * 2
  const gap = topHeader ? 0.9 * unit : 0
  const fadeHeight = spec.surface === "fade" ? 5 * unit : 0
  const contentHeight =
    padTop +
    topHeader +
    gap +
    bodyHeight +
    (footerHeight ? 0.9 * unit + footerHeight : 0) +
    padBottom
  const barHeight = Math.max(contentHeight, side ? side.height : 0) + fadeHeight
  const progress = Math.min(
    1,
    Math.max(0, (now - bar.startedAt) / BAR_ENTRANCE_MS)
  )
  const eased = 1 - Math.pow(1 - progress, 3)
  const y = offsetY + height - barHeight + (1 - eased) * barHeight * 0.6

  ctx.save()
  ctx.globalAlpha = eased
  ctx.beginPath()
  ctx.rect(offsetX, y, width, barHeight)
  ctx.clip()
  paintSurface(
    ctx,
    bar,
    spec,
    offsetX,
    y,
    width,
    barHeight,
    fadeHeight,
    options.imageCache
  )
  if (spec.topLine) {
    ctx.fillStyle = accent
    ctx.fillRect(offsetX, y + fadeHeight, width, spec.topLine * unit)
  }
  const top = y + fadeHeight
  const innerHeight = barHeight - fadeHeight
  side?.draw(offsetX, top, innerHeight)
  let cursor =
    top +
    (innerHeight - (contentHeight - padTop - padBottom) - padTop - padBottom) /
      2 +
    padTop
  const centerX = mainX + mainWidth / 2

  if (headerText && topHeader) {
    if (header === "rule") {
      const pill: TextStyle = {
        size: 1.35,
        weight: 600,
        line: 1,
        uppercase: true,
        spacing: 0.14,
      }
      const ref: TextStyle = {
        size: 3,
        weight: 500,
        line: 1.1,
        smallCaps: true,
      }
      const pillWidth = badge ? measure(ctx, badge, pill, unit) + 2.2 * unit : 0
      if (heading)
        drawText(ctx, heading, ref, unit, mainX, cursor, bar.textColor)
      if (badge) {
        const pillX = mainX + mainWidth - pillWidth
        ctx.fillStyle = `${bar.textColor}26`
        ctx.beginPath()
        ctx.roundRect(pillX, cursor + 0.6 * unit, pillWidth, 2.1 * unit, unit)
        ctx.fill()
        drawText(
          ctx,
          badge,
          pill,
          unit,
          pillX + pillWidth / 2,
          cursor + 0.6 * unit + 0.35 * unit,
          bar.textColor,
          "center"
        )
      }
      const lineStart =
        mainX + (heading ? measure(ctx, heading, ref, unit) + 1.4 * unit : 0)
      const lineEnd = mainX + mainWidth - pillWidth - (badge ? 1.4 * unit : 0)
      if (lineEnd > lineStart) {
        const line = ctx.createLinearGradient(lineStart, 0, lineEnd, 0)
        line.addColorStop(0, `${bar.textColor}cc`)
        line.addColorStop(1, `${bar.textColor}1a`)
        ctx.fillStyle = line
        ctx.fillRect(
          lineStart,
          cursor + 1.6 * unit,
          lineEnd - lineStart,
          0.14 * unit
        )
      }
    } else if (header === "kicker") {
      drawText(ctx, headerText, kickerStyle, unit, mainX, cursor, accent)
    } else if (header === "strip") {
      const strip: TextStyle = {
        size: 1.7,
        weight: 600,
        line: 1.9,
        uppercase: true,
        spacing: 0.06,
      }
      const stripWidth = Math.min(
        mainWidth + padX,
        Math.max(
          width * 0.34,
          measure(ctx, headerText, strip, unit) + 5.2 * unit
        )
      )
      ctx.fillStyle = accent
      ctx.fillRect(offsetX, top, stripWidth, strip.size * strip.line * unit)
      drawText(
        ctx,
        headerText,
        strip,
        unit,
        offsetX + 2.6 * unit,
        top,
        inkOn(accent)
      )
      ctx.fillRect(
        offsetX,
        top + strip.size * strip.line * unit,
        width,
        0.2 * unit
      )
    } else if (header === "pill") {
      const pill: TextStyle = { size: 1.7, weight: 700, line: 1.5 }
      const pillWidth = measure(ctx, headerText, pill, unit) + 2.8 * unit
      ctx.fillStyle = accent
      ctx.beginPath()
      ctx.roundRect(
        mainX,
        cursor,
        pillWidth,
        pill.size * pill.line * unit,
        99 * unit
      )
      ctx.fill()
      drawText(
        ctx,
        headerText,
        pill,
        unit,
        mainX + 1.4 * unit,
        cursor,
        inkOn(accent) === "#111111" ? bar.backgroundColorEnd : "#ffffff"
      )
    } else if (header === "label") {
      const label: TextStyle = { size: 1.75, weight: 700, line: 1.6 }
      const muted: TextStyle = {
        size: 1.35,
        weight: 600,
        line: 2.05,
        uppercase: true,
        spacing: 0.14,
      }
      const labelWidth = heading
        ? measure(ctx, heading, label, unit) + 2.4 * unit
        : 0
      if (heading) {
        ctx.fillStyle = bar.textColor
        ctx.fillRect(mainX, cursor, labelWidth, label.size * label.line * unit)
        drawText(
          ctx,
          heading,
          label,
          unit,
          mainX + 1.2 * unit,
          cursor,
          bar.backgroundColor
        )
      }
      if (badge) {
        ctx.globalAlpha *= 0.6
        drawText(
          ctx,
          badge,
          muted,
          unit,
          mainX + labelWidth + 1.2 * unit,
          cursor,
          bar.textColor
        )
        ctx.globalAlpha /= 0.6
      }
    } else if (header === "inline") {
      const ref: TextStyle = { size: 2.1, weight: 700, line: 1.3 }
      const muted: TextStyle = {
        size: 1.3,
        weight: 600,
        line: 2.1,
        uppercase: true,
        spacing: 0.14,
      }
      if (heading) drawText(ctx, heading, ref, unit, mainX, cursor, accent)
      if (badge) {
        ctx.globalAlpha *= 0.6
        drawText(
          ctx,
          badge,
          muted,
          unit,
          mainX + (heading ? measure(ctx, heading, ref, unit) + 1.4 * unit : 0),
          cursor,
          bar.textColor
        )
        ctx.globalAlpha /= 0.6
      }
    }
    cursor += topHeader + gap
  }

  // Body
  if (innerPad) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)"
    ctx.beginPath()
    ctx.roundRect(mainX, cursor, mainWidth, bodyHeight, 0.4 * unit)
    ctx.fill()
  }
  const textLeft = mainX + innerPad + numberColumn
  const bodyTop = cursor + innerPad
  applyFont(ctx, spec.body, unit, factor)
  if (spec.dropCap && paragraphs[0]?.text) {
    const cap: TextStyle = {
      ...spec.body,
      size: spec.body.size * factor * 2.3,
      weight: 600,
      line: 1,
      italic: false,
    }
    drawText(
      ctx,
      paragraphs[0].text.charAt(0),
      cap,
      unit,
      textLeft,
      bodyTop - 0.2 * unit,
      accent
    )
    applyFont(ctx, spec.body, unit, factor)
  }
  const highlights = spec.marker
    ? [...bar.text.matchAll(/\*([^*]+)\*/g)].map((match) => match[1] ?? "")
    : []
  lines.forEach((line, index) => {
    const lineTop = bodyTop + index * lineHeight
    const indent = spec.dropCap && index < 2 ? capWidth : 0
    let left = textLeft + indent
    if (spec.center) left = centerX - ctx.measureText(line.text).width / 2
    for (const phrase of highlights) {
      const at = phrase ? line.text.indexOf(phrase) : -1
      if (at < 0) continue
      const before = ctx.measureText(line.text.slice(0, at)).width
      ctx.fillStyle = accent
      ctx.fillRect(
        left + before - 0.15 * unit,
        lineTop + lineHeight * 0.52,
        ctx.measureText(phrase).width + 0.3 * unit,
        lineHeight * 0.4
      )
    }
    if (line.number !== undefined && numberColumn) {
      ctx.fillStyle = accent
      ctx.textAlign = "left"
      ctx.textBaseline = "middle"
      ctx.font = `700 ${spec.body.size * unit * factor * 0.78}px "Inter Variable", sans-serif`
      ctx.fillText(
        String(line.number),
        mainX + innerPad,
        lineTop + lineHeight / 2
      )
      applyFont(ctx, spec.body, unit, factor)
    }
    ctx.fillStyle = bar.textColor
    ctx.textAlign = "left"
    ctx.textBaseline = "middle"
    ctx.fillText(line.text, left, lineTop + lineHeight / 2)
  })
  cursor += bodyHeight

  if (footerHeight) {
    cursor += 0.9 * unit
    const footer: TextStyle = {
      size: 1.45,
      weight: 600,
      line: 2,
      uppercase: true,
      spacing: header === "footer-center" ? 0.3 : 0.08,
    }
    const footerWidth = measure(ctx, headerText, footer, unit)
    if (header === "footer-center") {
      drawText(ctx, headerText, footer, unit, centerX, cursor, accent, "center")
      ctx.fillStyle = accent
      const rule = 5 * unit
      ctx.fillRect(
        centerX - footerWidth / 2 - rule - 1.4 * unit,
        cursor + 1.45 * unit,
        rule,
        0.1 * unit
      )
      ctx.fillRect(
        centerX + footerWidth / 2 + 1.4 * unit,
        cursor + 1.45 * unit,
        rule,
        0.1 * unit
      )
    } else {
      const right = mainX + mainWidth
      drawText(ctx, headerText, footer, unit, right, cursor, accent, "right")
      ctx.fillStyle = accent
      ctx.fillRect(
        right - footerWidth - 4.2 * unit,
        cursor + 1.45 * unit,
        3 * unit,
        0.12 * unit
      )
    }
  }
  ctx.letterSpacing = "0px"

  // New words on a bar already on screen: the bar stays put and its words
  // fade in. Repainting the surface over them hides them, less each frame.
  const wordsShown =
    bar.changedAt === undefined
      ? 1
      : Math.min(1, Math.max(0, (now - bar.changedAt) / BAR_TEXT_FADE_MS))
  if (wordsShown < 1) {
    ctx.globalAlpha = eased * (1 - wordsShown)
    paintSurface(
      ctx,
      bar,
      spec,
      offsetX,
      y,
      width,
      barHeight,
      fadeHeight,
      options.imageCache
    )
    ctx.globalAlpha = eased
    if (spec.topLine) {
      ctx.fillStyle = accent
      ctx.fillRect(offsetX, y + fadeHeight, width, spec.topLine * unit)
    }
  }
  ctx.restore()
}
