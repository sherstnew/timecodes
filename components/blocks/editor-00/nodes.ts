import { HeadingNode, QuoteNode } from "@lexical/rich-text"
import { ListItemNode, ListNode } from "@lexical/list"
import { CodeNode, CodeHighlightNode } from "@lexical/code"
import { AutoLinkNode, LinkNode } from "@lexical/link"
import { ImageNode } from "./nodes/ImageNode" // Путь к файлу выше
import { Klass, LexicalNode } from "lexical"

export const nodes: Array<Klass<LexicalNode>> = [
  HeadingNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  CodeNode,
  CodeHighlightNode,
  LinkNode,
  AutoLinkNode,
  ImageNode,
]