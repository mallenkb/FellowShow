import type { DesignText } from "./lower-third-design-spec"

export interface DesignTextLayout {
  lines: string[]
  width: number
  height: number
  spec: DesignText
  surname?: string
}

function setFont(
  ctx: CanvasRenderingContext2D,
  spec: DesignText,
  unit: number,
  weight = spec.weight
): void {
  const family =
    spec.family === "serif"
      ? '"Fraunces Variable", Georgia, serif'
      : spec.family === "condensed"
        ? '"Barlow Condensed", sans-serif'
        : '"Inter Variable", sans-serif'
  ctx.font = `${spec.italic ? "italic " : ""}${spec.smallCaps ? "small-caps " : ""}${weight} ${spec.size * unit}px ${family}`
  ctx.letterSpacing = `${(spec.spacing ?? 0) * spec.size * unit}px`
}

function measure(
  ctx: CanvasRenderingContext2D,
  text: string,
  spec: DesignText,
  unit: number,
  surname?: string
): number {
  setFont(ctx, spec, unit)
  if (!surname || !text.endsWith(surname)) return ctx.measureText(text).width
  const prefix = text.slice(0, -surname.length)
  const left = ctx.measureText(prefix).width
  setFont(ctx, spec, unit, 700)
  return left + ctx.measureText(surname).width
}

export function layoutDesignText(
  ctx: CanvasRenderingContext2D,
  content: string,
  spec: DesignText,
  unit: number,
  maximum: number,
  surname?: string,
  nowrap = false
): DesignTextLayout {
  const text = spec.uppercase ? content.toUpperCase() : content
  const lines: string[] = []
  let line = ""
  for (const word of text.trim().split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word
    if (nowrap || measure(ctx, candidate, spec, unit, surname) <= maximum) {
      line = candidate
      continue
    }
    if (line) lines.push(line)
    line = ""
    for (const character of word) {
      if (
        line &&
        measure(ctx, line + character, spec, unit, surname) > maximum
      ) {
        lines.push(line)
        line = ""
      }
      line += character
    }
  }
  if (line) lines.push(line)
  const visible = lines.slice(0, 16)
  return {
    lines: visible,
    width: Math.max(
      0,
      ...visible.map((value) => measure(ctx, value, spec, unit, surname))
    ),
    height: visible.length * spec.size * unit * spec.line,
    spec,
    surname,
  }
}

export function drawDesignText(
  ctx: CanvasRenderingContext2D,
  layout: DesignTextLayout,
  x: number,
  y: number,
  unit: number,
  color: string,
  centered = false
): void {
  ctx.save()
  ctx.fillStyle = color
  ctx.textAlign = "left"
  ctx.textBaseline = "alphabetic"
  const { spec, surname } = layout
  const size = spec.size * unit
  for (const line of layout.lines) {
    setFont(ctx, spec, unit)
    const metrics = ctx.measureText(line)
    const ascent = metrics.fontBoundingBoxAscent ?? size * 0.8
    const descent = metrics.fontBoundingBoxDescent ?? size * 0.2
    const baseline = y + (size * spec.line - ascent - descent) / 2 + ascent
    const left = centered ? x - measure(ctx, line, spec, unit, surname) / 2 : x
    if (surname && line.endsWith(surname)) {
      const prefix = line.slice(0, -surname.length)
      setFont(ctx, spec, unit)
      ctx.fillText(prefix, left, baseline)
      const dx = ctx.measureText(prefix).width
      setFont(ctx, spec, unit, 700)
      ctx.fillText(surname, left + dx, baseline)
    } else {
      setFont(ctx, spec, unit)
      ctx.fillText(line, left, baseline)
    }
    y += size * spec.line
  }
  ctx.restore()
}
