import type { LowerThirdDesignStyle } from "@/types/lower-third-designs"

export interface DesignText {
  size: number
  weight: number
  line: number
  spacing?: number
  family?: "serif" | "condensed"
  italic?: boolean
  uppercase?: boolean
  smallCaps?: boolean
}

export interface DesignSpec {
  title: DesignText
  role: DesignText
  /** CSS padding in cqw, clockwise from top. */
  padding: readonly [number, number, number, number]
  gap: number
  roleColor: string
}

/** Values transcribed from FellowShow Lower Thirds.html, designs .d1 through .d15. */
export const DESIGN_SPECS: Record<LowerThirdDesignStyle, DesignSpec> = {
  "clean-white": {
    title: { size: 3.4, weight: 700, line: 1.1, spacing: -0.01 },
    role: { size: 1.9, weight: 500, line: 1.5 },
    padding: [1.4, 2.4, 1.5, 2.2],
    gap: 0.4,
    roleColor: "#475569",
  },
  "smoked-glass": {
    title: { size: 3.2, weight: 300, line: 1.1, spacing: 0.01 },
    role: { size: 1.5, weight: 500, line: 1.5, spacing: 0.24, uppercase: true },
    padding: [1.5, 3, 1.6, 3],
    gap: 0.7,
    roleColor: "#d9b25f",
  },
  "stacked-tabs": {
    title: { size: 3.3, weight: 700, line: 1.05 },
    role: { size: 1.8, weight: 600, line: 1.5 },
    padding: [1, 2.4, 1.1, 2.4],
    gap: 0,
    roleColor: "#111111",
  },
  "photo-circle": {
    title: { size: 2.9, weight: 700, line: 1.1 },
    role: { size: 1.6, weight: 400, line: 1.5 },
    padding: [1.2, 3, 1.2, 1.2],
    gap: 0.2,
    roleColor: "#cbd5e1",
  },
  capsule: {
    title: { size: 2.6, weight: 700, line: 1.5 },
    role: { size: 2, weight: 500, line: 1.5 },
    padding: [0.9, 2.6, 0.9, 1.6],
    gap: 0,
    roleColor: "#555555",
  },
  "news-strap": {
    title: {
      size: 4.2,
      weight: 700,
      line: 1,
      family: "condensed",
      uppercase: true,
    },
    role: { size: 1.7, weight: 500, line: 1.3 },
    padding: [1, 2.4, 1.1, 2.4],
    gap: 0.4,
    roleColor: "#444444",
  },
  "text-only": {
    title: { size: 3.8, weight: 800, line: 1.05, spacing: -0.015 },
    role: { size: 1.9, weight: 500, line: 1.5 },
    padding: [0, 0, 0, 0],
    gap: 1.9,
    roleColor: "#f1f5f9",
  },
  "ivory-serif": {
    title: { size: 3.4, weight: 600, line: 1.1, family: "serif" },
    role: { size: 2, weight: 400, line: 1.5, family: "serif", italic: true },
    padding: [1.6, 3, 1.6, 3],
    gap: 0.3,
    roleColor: "#8a6a3b",
  },
  angled: {
    title: { size: 3.2, weight: 700, line: 1.1 },
    role: { size: 1.7, weight: 600, line: 1.5, spacing: 0.04 },
    padding: [1, 4, 1, 2.4],
    gap: 0,
    roleColor: "#4c1d95",
  },
  "thick-accent": {
    title: { size: 3.9, weight: 800, line: 1.02 },
    role: { size: 1.6, weight: 600, line: 1.5, spacing: 0.12, smallCaps: true },
    padding: [0, 0, 0, 0],
    gap: 0.5,
    roleColor: "#fde68a",
  },
  "split-strip": {
    title: { size: 3.2, weight: 700, line: 1.1 },
    role: { size: 1.6, weight: 400, line: 1.5, spacing: 0.06 },
    padding: [1, 2.6, 0.9, 2.6],
    gap: 0,
    roleColor: "#e2e8f0",
  },
  "logo-square": {
    title: { size: 3, weight: 800, line: 1.1 },
    role: { size: 1.7, weight: 500, line: 1.5 },
    padding: [1.2, 3, 1.3, 2.2],
    gap: 0.2,
    roleColor: "#ffffff",
  },
  "outline-frame": {
    title: { size: 3.1, weight: 600, line: 1.1, spacing: 0.02 },
    role: { size: 1.6, weight: 400, line: 1.5, spacing: 0.2, uppercase: true },
    padding: [1.3, 2.6, 1.4, 2.6],
    gap: 0.5,
    roleColor: "#e5e7eb",
  },
  "long-rule": {
    title: { size: 4.2, weight: 300, line: 1, spacing: -0.01 },
    role: { size: 1.7, weight: 600, line: 1.5, spacing: 0.14, uppercase: true },
    padding: [0, 0, 0, 0],
    gap: 0.9,
    roleColor: "#bae6fd",
  },
  centered: {
    title: { size: 3, weight: 700, line: 1.1 },
    role: { size: 1.6, weight: 700, line: 1.5, spacing: 0.12, uppercase: true },
    padding: [0.9, 3.2, 0.9, 3.2],
    gap: 0,
    roleColor: "#111111",
  },
}
