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
    <div className="flex flex-col gap-4 px-[12px] py-[4px]">
      {TESTAMENTS.map((testament) => {
        const testamentBooks = books.filter(
          (book) => book.testament === testament.id
        )
        if (testamentBooks.length === 0) return null
        return (
          <section key={testament.id} className="flex flex-col gap-2">
            <h3 className="text-[0.6875rem] font-semibold tracking-wider text-muted-foreground uppercase">
              {testament.label}
            </h3>
            <div className="grid grid-cols-3 gap-[6px]">
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
                      "flex min-w-0 flex-col items-start rounded-[6px] border px-3 py-2 text-left transition-colors",
                      isCurrent
                        ? "border-transparent bg-primary/20 dark:border-primary-emphasis/60 dark:bg-primary/5"
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
