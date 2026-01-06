import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin"
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin"
import { ListPlugin } from "@lexical/react/LexicalListPlugin"
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin"
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin"
import { ContentEditable } from "@lexical/react/LexicalContentEditable"
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin"
import { TRANSFORMERS } from "@lexical/markdown"
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary"

export function Plugins() {
  return (
    <>
      <RichTextPlugin
        contentEditable={
          <ContentEditable className="min-h-[450px] outline-none px-4 py-4 text-base resize-none" />
        }
        ErrorBoundary={LexicalErrorBoundary}
      />
      <HistoryPlugin />
      <ListPlugin />
      <LinkPlugin />
      <AutoFocusPlugin />
      <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
    </>
  )
}