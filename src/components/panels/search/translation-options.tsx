import {
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
} from "@/components/ui/select"
import { useBible } from "@/hooks/use-bible"

export function TranslationOptions({
  translations,
}: {
  translations: ReturnType<typeof useBible>["translations"]
}) {
  const preferredEnglishOrder = ["NKJV", "NIV", "KJV", "AMP", "NLT"]
  const englishTranslations = translations
    .filter((t) => t.language === "en")
    .sort((a, b) => {
      const aIndex = preferredEnglishOrder.indexOf(a.abbreviation)
      const bIndex = preferredEnglishOrder.indexOf(b.abbreviation)
      if (aIndex !== -1 || bIndex !== -1) {
        return (
          (aIndex === -1 ? preferredEnglishOrder.length : aIndex) -
          (bIndex === -1 ? preferredEnglishOrder.length : bIndex)
        )
      }
      return a.abbreviation.localeCompare(b.abbreviation)
    })
  const otherTranslations = translations.filter((t) => t.language !== "en")

  return (
    <>
      {englishTranslations.length > 0 && (
        <SelectGroup>
          <SelectLabel className="text-[0.625rem] font-semibold tracking-wider text-muted-foreground uppercase">
            English
          </SelectLabel>
          {englishTranslations.map((t) => (
            <SelectItem key={t.id} value={String(t.id)}>
              {t.abbreviation}
            </SelectItem>
          ))}
        </SelectGroup>
      )}
      {englishTranslations.length > 0 && otherTranslations.length > 0 && (
        <SelectSeparator />
      )}
      {otherTranslations.length > 0 && (
        <SelectGroup>
          <SelectLabel className="text-[0.625rem] font-semibold tracking-wider text-muted-foreground uppercase">
            Other Languages
          </SelectLabel>
          {otherTranslations.map((t) => (
            <SelectItem key={t.id} value={String(t.id)}>
              {t.abbreviation}
            </SelectItem>
          ))}
        </SelectGroup>
      )}
    </>
  )
}
