import { useEffect, type ReactNode } from "react"
import { useEditor, useEditorState, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import {
  BoldIcon,
  ItalicIcon,
  ListIcon,
  ListOrderedIcon,
  UnderlineIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { fieldSurfaceClassName } from "@/components/ui/field-styles"
import { cn } from "@/lib/utils"
import { sanitizeAnnouncementDocument } from "@/lib/announcements"
import type { AnnouncementDocument } from "@/types"

interface AnnouncementEditorProps {
  content: AnnouncementDocument
  onChange: (content: AnnouncementDocument) => void
  isActive?: boolean
  fill?: boolean
  contentLabel?: string
  compactToolbar?: boolean
  seamless?: boolean
  placeholder?: string
  toolbarActions?: ReactNode
}

export default function AnnouncementEditor({
  content,
  onChange,
  isActive = true,
  fill = false,
  contentLabel = "Note content",
  compactToolbar = false,
  seamless = false,
  placeholder,
  toolbarActions,
}: AnnouncementEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        blockquote: false,
        code: false,
        codeBlock: false,
        heading: false,
        horizontalRule: false,
        link: false,
        strike: false,
      }),
    ],
    content,
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-label": contentLabel,
        "aria-multiline": "true",
        ...(placeholder ? { "aria-placeholder": placeholder } : {}),
        class: cn(
          "min-h-32 px-3 py-2 text-sm leading-relaxed outline-none [&_ol]:ml-5 [&_ol]:list-decimal [&_p]:mb-2 [&_ul]:ml-5 [&_ul]:list-disc",
          fill && "min-h-full"
        ),
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange(sanitizeAnnouncementDocument(currentEditor.getJSON()))
    },
  })

  useEffect(() => {
    if (!editor || !isActive) return
    // Schema equality includes default list attributes. A JSON string comparison
    // reloads otherwise identical saved lists and moves the cursor while typing.
    const next = editor.schema.nodeFromJSON(content)
    if (editor.state.doc.eq(next)) return
    const { from, to } = editor.state.selection
    editor.commands.setContent(content, { emitUpdate: false })
    const end = editor.state.doc.content.size
    editor.commands.setTextSelection({
      from: Math.min(from, end),
      to: Math.min(to, end),
    })
  }, [content, editor, isActive])

  const formatting = useEditorState({
    editor,
    // The hook's initial snapshot can still contain a null editor after the
    // editor instance is created, before its first transaction.
    selector: () => ({
      bold: editor?.isActive("bold") ?? false,
      italic: editor?.isActive("italic") ?? false,
      underline: editor?.isActive("underline") ?? false,
      bullets: editor?.isActive("bulletList") ?? false,
      numbers: editor?.isActive("orderedList") ?? false,
      empty: editor?.isEmpty ?? true,
    }),
  })

  if (!editor) {
    return (
      <div
        className={cn(
          "h-40 animate-pulse rounded-[10px] bg-muted/40",
          fill && "min-h-32 flex-1"
        )}
      />
    )
  }

  const toolClass = (active: boolean) =>
    cn(
      compactToolbar ? "size-7" : "size-8",
      active && "bg-accent text-accent-foreground"
    )
  const toolIconClass = compactToolbar ? "size-3.5" : "size-4"

  return (
    <div
      className={cn(
        seamless
          ? "bg-transparent"
          : cn("overflow-hidden", fieldSurfaceClassName),
        fill && "flex min-h-32 flex-1 flex-col"
      )}
    >
      <div
        className={cn(
          "flex shrink-0 flex-wrap items-center gap-2",
          seamless && "pb-2",
          !seamless && "border-b border-border"
        )}
      >
        <div
          role="toolbar"
          aria-label="Text formatting"
          className={cn(
            "flex items-center",
            compactToolbar ? "gap-0 p-0.5" : "gap-0.5 p-1"
          )}
          onMouseDown={(event) => {
            if (
              event.target instanceof Element &&
              event.target.closest("button")
            )
              event.preventDefault()
          }}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={toolClass(formatting?.bold ?? false)}
            onClick={() => editor.chain().focus().toggleBold().run()}
            aria-label="Bold"
            aria-pressed={formatting?.bold ?? false}
          >
            <BoldIcon className={toolIconClass} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={toolClass(formatting?.italic ?? false)}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            aria-label="Italic"
            aria-pressed={formatting?.italic ?? false}
          >
            <ItalicIcon className={toolIconClass} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={toolClass(formatting?.underline ?? false)}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            aria-label="Underline"
            aria-pressed={formatting?.underline ?? false}
          >
            <UnderlineIcon className={toolIconClass} />
          </Button>
          <span
            className={cn(
              "w-px bg-border",
              compactToolbar ? "mx-0.5 h-4" : "mx-1 h-5"
            )}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={toolClass(formatting?.bullets ?? false)}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            aria-label="Bulleted list"
            aria-pressed={formatting?.bullets ?? false}
          >
            <ListIcon className={toolIconClass} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={toolClass(formatting?.numbers ?? false)}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            aria-label="Numbered list"
            aria-pressed={formatting?.numbers ?? false}
          >
            <ListOrderedIcon className={toolIconClass} />
          </Button>
        </div>
        {toolbarActions ? (
          <div className="ml-auto flex max-w-full min-w-0 flex-wrap items-center justify-end gap-2">
            {toolbarActions}
          </div>
        ) : null}
      </div>
      <div
        className={cn(
          "relative",
          fill && "flex min-h-0 flex-1 flex-col",
          seamless && cn("overflow-hidden", fieldSurfaceClassName)
        )}
      >
        <EditorContent
          editor={editor}
          className={fill ? "min-h-0 flex-1 overflow-y-auto" : undefined}
        />
        {placeholder && editor.isEmpty && formatting?.empty ? (
          <p
            aria-hidden="true"
            className="pointer-events-none absolute top-2 right-3 left-3 text-sm leading-relaxed text-muted-foreground"
          >
            {placeholder}
          </p>
        ) : null}
      </div>
    </div>
  )
}
