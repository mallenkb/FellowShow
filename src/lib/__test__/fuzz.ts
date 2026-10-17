/// <reference types="node" />
import { inspect } from "node:util"

const configuredCases = Number(process.env.FUZZ_CASES ?? 1_000)
const configuredSeed = Number(process.env.FUZZ_SEED ?? 0x5eed2026)

if (!Number.isSafeInteger(configuredCases) || configuredCases < 1) {
  throw new Error("FUZZ_CASES must be a positive safe integer")
}
if (!Number.isSafeInteger(configuredSeed) || configuredSeed < 0) {
  throw new Error("FUZZ_SEED must be a nonnegative safe integer")
}

export class FuzzRandom {
  private state: number

  constructor(seed: number) {
    this.state = seed
  }

  integer(minimum: number, maximum: number): number {
    this.state = (Math.imul(this.state, 1_664_525) + 1_013_904_223) >>> 0
    return (
      minimum + Math.floor((this.state / 2 ** 32) * (maximum - minimum + 1))
    )
  }

  pick<T>(values: readonly T[]): T {
    return values[this.integer(0, values.length - 1)]
  }

  text(maximumLength = 100): string {
    const characters = [
      "a",
      "Z",
      "0",
      "9",
      " ",
      "\t",
      "\n",
      "\r",
      "\0",
      "é",
      "e\u0301",
      "ɔ",
      "Ɛ",
      "İ",
      "中",
      "🙂",
      "\ud800",
      "\udfff",
      "[",
      "]",
      "{",
      "}",
      "\\",
      ":",
      "'",
      "&",
      "<",
      ">",
      "\u00a0",
      "\u2028",
      "\u202e",
    ]
    return Array.from({ length: this.integer(0, maximumLength) }, () =>
      this.integer(0, 4) === 0
        ? String.fromCodePoint(this.integer(0, 0x10ffff))
        : this.pick(characters)
    ).join("")
  }

  number(): number {
    return this.pick([
      NaN,
      Infinity,
      -Infinity,
      0,
      -0,
      1,
      -1,
      Number.MAX_VALUE,
      Number.MIN_VALUE,
      Number.MAX_SAFE_INTEGER,
      this.integer(-10_000, 10_000),
    ])
  }

  value(depth = 0): unknown {
    switch (this.integer(0, depth >= 3 ? 4 : 6)) {
      case 0:
        return null
      case 1:
        return this.pick([true, false])
      case 2:
        return this.number()
      case 3:
        return this.text()
      case 4:
        return undefined
      case 5:
        return Array.from({ length: this.integer(0, 6) }, () =>
          this.value(depth + 1)
        )
      default:
        return Object.fromEntries(
          Array.from({ length: this.integer(0, 6) }, () => [
            this.pick([
              "type",
              "id",
              "content",
              "text",
              "marks",
              "__proto__",
              "constructor",
            ]),
            this.value(depth + 1),
          ])
        )
    }
  }
}

/** Replay a failure with the printed seed, case number, and original generator. */
export function fuzzCases<T>(
  generate: (random: FuzzRandom) => T,
  verify: (input: T) => void,
  salt = 0
): void {
  const random = new FuzzRandom((configuredSeed ^ salt) >>> 0)
  let failureCount = 0
  let firstFailure:
    { iteration: number; sample: string; cause: unknown } | undefined
  for (let iteration = 0; iteration < configuredCases; iteration += 1) {
    const input = generate(random)
    try {
      verify(input)
    } catch (cause) {
      failureCount += 1
      if (firstFailure) continue
      const sample = inspect(input, {
        depth: 4,
        maxArrayLength: 8,
        maxStringLength: 160,
        breakLength: 100,
      }).slice(0, 1_200)
      firstFailure = { iteration, sample, cause }
    }
  }
  if (firstFailure) {
    throw new Error(
      `Fuzz failures=${failureCount}/${configuredCases}: FUZZ_SEED=${configuredSeed}, salt=${salt}, first case=${firstFailure.iteration}, input=${firstFailure.sample}`,
      { cause: firstFailure.cause }
    )
  }
}

export async function fuzzCasesAsync<T>(
  generate: (random: FuzzRandom) => T,
  verify: (input: T) => Promise<void>,
  salt = 0
): Promise<void> {
  const random = new FuzzRandom((configuredSeed ^ salt) >>> 0)
  for (let iteration = 0; iteration < configuredCases; iteration += 1) {
    const input = generate(random)
    try {
      await verify(input)
    } catch (cause) {
      throw new Error(
        `FUZZ_SEED=${configuredSeed}, salt=${salt}, case=${iteration}, input=${inspect(input, { depth: 3, maxStringLength: 160, maxArrayLength: 8 }).slice(0, 1200)}`,
        { cause }
      )
    }
  }
}
