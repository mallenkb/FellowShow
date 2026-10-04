import { useEffect } from "react"
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
import { cn } from "@/lib/utils"
import { sanitizeAnnouncementDocument } from "@/lib/announcements"
import type { AnnouncementDocument } from "@/types"

interface AnnouncementEditorProps {
  content: AnnouncementDocument
  onChange: (content: AnnouncementDocument) => void
}

export default function AnnouncementEditor({
  content,
  onChange,
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
        "aria-label": "Note content",
        "aria-multiline": "true",
        class:
          "min-h-32 px-3 py-2 text-sm leading-relaxed outline-none [&_ol]:ml-5 [&_ol]:list-decimal [&_ul]:ml-5 [&_ul]:list-disc [&_p]:mb-2",
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange(sanitizeAnnouncementDocument(currentEditor.getJSON()))
    },
  })

  useEffect(() => {
    if (!editor) return
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
  }, [content, editor])

  const formatting = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => ({
      bold: currentEditor?.isActive("bold") ?? false,
      italic: currentEditor?.isActive("italic") ?? false,
      underline: currentEditor?.isActive("underline") ?? false,
      bullets: currentEditor?.isActive("bulletList") ?? false,
      numbers: currentEditor?.isActive("orderedList") ?? false,
    }),
  })

  if (!editor) {
    return <div className="h-40 animate-pulse rounded-md bg-muted/40" />
  }

  const toolClass = (active: boolean) =>
    cn("size-8", active && "bg-accent text-accent-foreground")

  return (
    <div className="overflow-hidden rounded-md border border-border bg-background">
      <div
        role="toolbar"
        aria-label="Text formatting"
        className="flex items-center gap-0.5 border-b border-border p-1"
        onMouseDown={(event) => {
          if (event.target instanceof Element && event.target.closest("button"))
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
          <BoldIcon className="size-4" />
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
          <ItalicIcon className="size-4" />
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
          <UnderlineIcon className="size-4" />
        </Button>
        <span className="mx-1 h-5 w-px bg-border" />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={toolClass(formatting?.bullets ?? false)}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          aria-label="Bulleted list"
          aria-pressed={formatting?.bullets ?? false}
        >
          <ListIcon className="size-4" />
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
          <ListOrderedIcon className="size-4" />
        </Button>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
