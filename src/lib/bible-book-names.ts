const ASANTE_TWI_BOOK_NAMES = [
  "1 Mose",
  "2 Mose",
  "3 Mose",
  "4 Mose",
  "5 Mose",
  "Yosua",
  "Atemmufoɔ",
  "Rut",
  "1 Samuel",
  "2 Samuel",
  "1 Ahemfoɔ",
  "2 Ahemfoɔ",
  "1 Berɛsosɛm",
  "2 Berɛsosɛm",
  "Ɛsra",
  "Nehemia",
  "Ɛster",
  "Hiob",
  "Nnwom",
  "Mmɛbusɛm",
  "Ɔsɛnkafoɔ",
  "Nnwom Mu Dwom",
  "Yesaia",
  "Yeremia",
  "Kwadwom",
  "Hesekiel",
  "Daniel",
  "Hosea",
  "Yoɛl",
  "Amos",
  "Obadia",
  "Yona",
  "Mika",
  "Nahum",
  "Habakuk",
  "Sefania",
  "Hagai",
  "Sakaria",
  "Malaki",
  "Mateo",
  "Marko",
  "Luka",
  "Yohane",
  "Asomafoɔ",
  "Romafoɔ",
  "1 Korintofoɔ",
  "2 Korintofoɔ",
  "Galatifoɔ",
  "Efesofoɔ",
  "Filipifoɔ",
  "Kolosefoɔ",
  "1 Tesalonikafoɔ",
  "2 Tesalonikafoɔ",
  "1 Timoteo",
  "2 Timoteo",
  "Tito",
  "Filemon",
  "Hebrifoɔ",
  "Yakobo",
  "1 Petro",
  "2 Petro",
  "1 Yohane",
  "2 Yohane",
  "3 Yohane",
  "Yuda",
  "Adiyisɛm",
] as const

const ENGLISH_BOOK_NAMES = [
  "Genesis",
  "Exodus",
  "Leviticus",
  "Numbers",
  "Deuteronomy",
  "Joshua",
  "Judges",
  "Ruth",
  "1 Samuel",
  "2 Samuel",
  "1 Kings",
  "2 Kings",
  "1 Chronicles",
  "2 Chronicles",
  "Ezra",
  "Nehemiah",
  "Esther",
  "Job",
  "Psalms",
  "Proverbs",
  "Ecclesiastes",
  "Song of Solomon",
  "Isaiah",
  "Jeremiah",
  "Lamentations",
  "Ezekiel",
  "Daniel",
  "Hosea",
  "Joel",
  "Amos",
  "Obadiah",
  "Jonah",
  "Micah",
  "Nahum",
  "Habakkuk",
  "Zephaniah",
  "Haggai",
  "Zechariah",
  "Malachi",
  "Matthew",
  "Mark",
  "Luke",
  "John",
  "Acts",
  "Romans",
  "1 Corinthians",
  "2 Corinthians",
  "Galatians",
  "Ephesians",
  "Philippians",
  "Colossians",
  "1 Thessalonians",
  "2 Thessalonians",
  "1 Timothy",
  "2 Timothy",
  "Titus",
  "Philemon",
  "Hebrews",
  "James",
  "1 Peter",
  "2 Peter",
  "1 John",
  "2 John",
  "3 John",
  "Jude",
  "Revelation",
] as const

function isAsanteTwiTranslation(translation: string): boolean {
  return ["WASNA", "ATWI", "TK"].includes(translation.trim().toUpperCase())
}

function formatTranslationLabel(translation: string): string {
  return isAsanteTwiTranslation(translation) ? "Asante Twi" : translation
}

export function formatBibleBookName(
  bookName: string,
  bookNumber: number,
  translation: string,
  includeEnglish = true
): string {
  if (!isAsanteTwiTranslation(translation)) return bookName

  const englishBookName = ENGLISH_BOOK_NAMES[bookNumber - 1] ?? bookName
  const twiBookName = ASANTE_TWI_BOOK_NAMES[bookNumber - 1] ?? bookName
  if (!includeEnglish || twiBookName === englishBookName) return twiBookName
  return `${twiBookName} (${englishBookName})`
}

export function formatBibleReference(
  bookName: string,
  bookNumber: number,
  chapter: number,
  verse: number,
  translation: string
): string {
  const displayBookName = formatBibleBookName(
    bookName,
    bookNumber,
    translation,
    false
  )
  const translationSuffix = translation
    ? ` (${formatTranslationLabel(translation)})`
    : ""
  return `${displayBookName} ${chapter}:${verse}${translationSuffix}`
}
