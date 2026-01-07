"use client";

import React, { useEffect, useMemo, useState } from "react";
import { JSX } from 'react';

const FORMAT_BOLD = 1;
const FORMAT_ITALIC = 2;
const FORMAT_UNDERLINE = 4;
const FORMAT_STRIKETHROUGH = 8;
const FORMAT_CODE = 16;

type EditorRendererProps = {
  serialized: string | any;
  className?: string;
};

/**
 * В Tailwind (и в shadcn/ui) preflight сбрасывает стили h1-h6 (они наследуют размер/жирность),
 * поэтому "h2" в DOM может выглядеть как обычный текст.
 * Решение: навесить типографские классы на заголовки (или обернуть в prose).
 */
function headingClass(level: number) {
  switch (level) {
    case 1:
      return "scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl";
    case 2:
      return "scroll-m-20 text-3xl font-semibold tracking-tight";
    case 3:
      return "scroll-m-20 text-2xl font-semibold tracking-tight";
    case 4:
      return "scroll-m-20 text-xl font-semibold tracking-tight";
    case 5:
      return "scroll-m-20 text-lg font-semibold tracking-tight";
    case 6:
      return "scroll-m-20 text-base font-semibold tracking-tight";
    default:
      return "scroll-m-20 text-3xl font-semibold tracking-tight";
  }
}

function parseHeadingLevel(node: any): number {
  const candidates = [
    node?.tag,
    node?.tagName,
    node?.name,
    node?.attrs?.tagName,
    node?.attrs?.tag,
    node?.headingLevel,
    node?.level,
    node?.attributes?.level,
    node?.attrs?.level,
  ];

  for (const c of candidates) {
    if (c === undefined || c === null) continue;

    if (typeof c === "string") {
      const m = c.match(/^h([1-6])$/i);
      if (m) return Number(m[1]);

      const n = parseInt(c, 10);
      if (!Number.isNaN(n) && n >= 1 && n <= 6) return n;
    }

    if (typeof c === "number" && c >= 1 && c <= 6) return c;
  }

  return 2;
}

export function EditorRenderer({ serialized, className }: EditorRendererProps) {
  let obj: any = null;

  const [resolvedMap, setResolvedMap] = useState<Record<string, string>>({});

  // collect local paths that need resolving
  const pathsToResolve = useMemo(() => {
    const out = new Set<string>();
    if (!serialized) return out;
    try {
      const parsed = typeof serialized === 'string' ? JSON.parse(serialized) : serialized;
      const root = parsed.root ?? parsed;
      function walk(node: any) {
        if (!node) return;
        if (Array.isArray(node)) return node.forEach(walk);
        if (typeof node !== 'object') return;
        if (node.type === 'image') {
          const src = node.src || node?.attrs?.src || '';
          if (typeof src === 'string' && (src.startsWith('/timecodes-images/') || src.startsWith('/uploads/') || src.startsWith('/timecodes/'))) out.add(src);
        }
        if (node.children && Array.isArray(node.children)) node.children.forEach(walk);
      }
      walk(root);
    } catch (e) {}
    return out;
  }, [serialized]);

  useEffect(() => {
    let mounted = true;
    async function resolveAll() {
      if (!pathsToResolve || pathsToResolve.size === 0) return;
      const map: Record<string, string> = {};
      for (const p of Array.from(pathsToResolve)) {
        if (resolvedMap[p]) {
          map[p] = resolvedMap[p];
          continue;
        }
        try {
          const res = await fetch('/api/admin/resolve-download', { method: 'POST', body: JSON.stringify({ path: p }), headers: { 'content-type': 'application/json' } });
          if (!res.ok) continue;
          const j = await res.json();
          if (j?.href) map[p] = j.href;
        } catch (e) {}
      }
      if (mounted && Object.keys(map).length > 0) setResolvedMap((s) => ({ ...s, ...map }));
    }
    resolveAll();
    return () => { mounted = false; };
  }, [pathsToResolve]);

  if (!serialized) return <div className={className} />;

  if (typeof serialized === "string") {
    try {
      obj = JSON.parse(serialized);
    } catch {
      // Если это не JSON, рендерим как plain text
      return <div className={className}>{serialized}</div>;
    }
  } else {
    obj = serialized;
  }

  function renderNodeToReact(node: any, key?: number | string): React.ReactNode {
    if (!node) return null;

    if (Array.isArray(node)) return node.map((n, i) => renderNodeToReact(n, i));

    const type = node.type;

    const children = (node.children || []).map((c: any, i: number) =>
      renderNodeToReact(c, i)
    );

    // Иногда сериализатор кладёт "tag" на элемент. Если это h1-h6 — рендерим как заголовок + классы.
    const possibleTag =
      node.tag ||
      node.tagName ||
      node.name ||
      (node.attrs && (node.attrs.tagName || node.attrs.tag)) ||
      null;

    if (
      possibleTag &&
      typeof possibleTag === "string" &&
      /^h[1-6]$/i.test(possibleTag)
    ) {
      const level = Number(possibleTag.slice(1));
      const Tag = possibleTag.toLowerCase() as keyof JSX.IntrinsicElements;
      return React.createElement(
        Tag,
        { key, className: headingClass(level) },
        children
      );
    }

    switch (type) {
      case "root":
        return <React.Fragment key={key}>{children}</React.Fragment>;

      case "paragraph": {
        const isCenter = node.format === "center";
        const isEmpty = !children || children.length === 0;

        // Пустой параграф лучше не терять (чтобы сохранялись переносы)
        return (
          <p key={key} className={isCenter ? "text-center" : undefined}>
            {isEmpty ? <br /> : children}
          </p>
        );
      }

      case "heading": {
        const level = parseHeadingLevel(node);
        const Tag = `h${level}` as keyof JSX.IntrinsicElements;

        return React.createElement(
          Tag,
          { key, className: headingClass(level) },
          children
        );
      }

      case "text": {
        const text = node.text ?? "";
        let res: React.ReactNode = text;

        const fmt = node.format ?? 0;

        // Важно: ключи должны быть стабильными, но тут достаточно key на внешнем узле.
        if (fmt & FORMAT_CODE) res = <code>{res}</code>;
        if (fmt & FORMAT_STRIKETHROUGH) res = <s>{res}</s>;
        if (fmt & FORMAT_UNDERLINE) res = <u>{res}</u>;
        if (fmt & FORMAT_ITALIC) res = <em>{res}</em>;
        if (fmt & FORMAT_BOLD) res = <strong>{res}</strong>;

        return <React.Fragment key={key}>{res}</React.Fragment>;
      }

      case "quote":
        return (
          <blockquote
            key={key}
            className="mt-4 border-l-2 pl-4 italic text-muted-foreground"
          >
            {children}
          </blockquote>
        );

      case "image": {
        const src = node.src || node?.attrs?.src || "";
        const alt = node.altText || node.alt || "";

        // Если мы резолвили локальный путь — используем href, иначе используем переданный src.
        const effectiveSrc = (typeof src === 'string' && resolvedMap[src]) ? resolvedMap[src] : src;

        return (
          <img
            key={key}
            src={effectiveSrc}
            alt={alt}
            className="max-w-full rounded block mx-auto"
            loading="lazy"
          />
        );
      }

      default:
        // Фолбэк: просто рендерим детей
        return <React.Fragment key={key}>{children}</React.Fragment>;
    }
  }

  const root = obj.root ?? obj;

  return (
    // Если хочешь, можешь заменить на "prose ..." — но даже без этого заголовки теперь будут выглядеть как заголовки
    <div className={className}>{renderNodeToReact(root)}</div>
  );
}

export default EditorRenderer;