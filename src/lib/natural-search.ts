const STOP_WORDS = new Set(
  "a an the and or of to in on for with by from is are was were be been it that this my me i you your we our they their he his her its as at have has had do does did can could would should please find show search looking song songs hymn hymns scripture scriptures verse verses bible about where says say some which what when".split(
    " "
  )
)
const TOPICS = [
  ["salvation", "saved", "save", "savior", "saviour", "redeemed", "redemption"],
  ["forgiveness", "forgive", "forgiven", "pardon", "mercy"],
  ["strength", "strong", "power", "mighty"],
  ["fear", "afraid", "anxiety", "anxious", "worry"],
  ["thanksgiving", "thankful", "thanks", "gratitude"],
  ["worship", "praise", "adoration", "adore"],
  ["resurrection", "risen", "arose", "alive"],
  ["healing", "heal", "healed"],
  ["faith", "trust", "believe"],
]

export function normalizeNaturalSearch(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function searchTerms(value: string): string[] {
  return [
    ...new Set(
      normalizeNaturalSearch(value)
        .split(" ")
        .filter((word) => word.length > 1 && !STOP_WORDS.has(word))
    ),
  ].slice(0, 16)
}

export function relatedSearchTerms(word: string): readonly string[] {
  return TOPICS.find((group) => group.includes(word)) ?? [word]
}
