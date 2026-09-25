import { formatBibleBookName } from "@/lib/bible-book-names"
import { cn } from "@/lib/utils"
import type { Book } from "@/types"

const TESTAMENTS = [
  { id: "OT", label: "Old Testament" },
  { id: "NT", label: "New Testament" },
] as const

export function ScriptureBookGrid({
  books,
  translationAbbreviation,
  currentBookNumber,
  onSelect,
}: {
  books: Book[]
  translationAbbreviation: string
  currentBookNumber: number | undefined
  onSelect: (book: Book) => void
}) {
  return (
    <div className="flex flex-col gap-4 p-3">
      {TESTAMENTS.map((testament) => {
        const testamentBooks = books.filter(
          (book) => book.testament === testament.id
        )
        if (testamentBooks.length === 0) return null
        return (
          <section key={testament.id} className="flex flex-col gap-2">
            <h3 className="px-1 text-[0.6875rem] font-semibold tracking-wider text-muted-foreground uppercase">
              {testament.label}
            </h3>
            <div className="grid grid-cols-3 gap-1.5">
              {testamentBooks.map((book) => {
                const name = formatBibleBookName(
                  book.name,
                  book.book_number,
                  translationAbbreviation,
                  false
                )
                const isCurrent = book.book_number === currentBookNumber
                return (
                  <button
                    key={book.id}
                    type="button"
                    title={name}
                    onClick={() => onSelect(book)}
                    className={cn(
                      "flex min-w-0 flex-col items-start rounded-lg border px-2.5 py-2 text-left transition-colors",
                      isCurrent
                        ? "border-[#101084]/50 bg-[#101084]/10 dark:border-[#F1E600]/60 dark:bg-[#F1E600]/5"
                        : "border-border bg-background hover:bg-muted/50"
                    )}
                  >
                    <span className="w-full truncate text-sm font-medium text-foreground">
                      {name}
                    </span>
                    <span className="w-full truncate text-xs text-muted-foreground">
                      {book.abbreviation}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
