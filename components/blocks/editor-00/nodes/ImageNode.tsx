import {
  DecoratorNode,
  DOMExportOutput,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from "lexical";
import * as React from "react";
import { Suspense } from "react";

export type SerializedImageNode = Spread<
  {
    src: string;
    altText: string;
  },
  SerializedLexicalNode
>;

export class ImageNode extends DecoratorNode<React.JSX.Element> {
  __src: string;
  __altText: string;
  __preview?: string | null;

  static getType(): string {
    return "image";
  }

  static clone(node: ImageNode): ImageNode {
    const n = new ImageNode(node.__src, node.__altText, node.__key);
    n.__preview = node.__preview;
    return n;
  }

  constructor(src: string, altText: string, key?: NodeKey, preview?: string | null) {
    super(key);
    this.__src = src;
    this.__altText = altText;
    this.__preview = preview ?? null;
  }

  // ОБЯЗАТЕЛЬНЫЙ МЕТОД: Исправляет ошибку "base method not extended"
  createDOM(): HTMLElement {
    const span = document.createElement("span");
    span.style.display = "inline-block";
    return span;
  }

  updateDOM(): false {
    return false;
  }

  static importJSON(serializedNode: SerializedImageNode): ImageNode {
    const { src, altText } = serializedNode;
    const node = $createImageNode(src, altText);
    return node;
  }

  exportJSON(): SerializedImageNode {
    return {
      ...super.exportJSON(),
      src: this.__src,
      altText: this.__altText,
      type: "image",
      version: 1,
    };
  }

  // Отрисовка компонента внутри редактора
  decorate(): React.JSX.Element {
    return (
      <Suspense fallback={null}>
        <img
          src={this.__preview || this.__src}
          alt={this.__altText}
          style={{
            maxWidth: "100%",
            height: "auto",
            borderRadius: "8px",
            border: "1px solid #ddd",
          }}
        />
      </Suspense>
    );
  }
}

export function $createImageNode(src: string, altText: string, preview?: string | null): ImageNode {
  return new ImageNode(src, altText, undefined, preview);
}

export function $isImageNode(node: LexicalNode | null | undefined): node is ImageNode {
  return node instanceof ImageNode;
}