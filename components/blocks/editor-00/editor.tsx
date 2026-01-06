"use client";

import {
    InitialConfigType,
    LexicalComposer,
} from "@lexical/react/LexicalComposer";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
    EditorState,
    SerializedEditorState,
    FORMAT_TEXT_COMMAND,
    FORMAT_ELEMENT_COMMAND,
    UNDO_COMMAND,
    REDO_COMMAND,
    $getSelection,
    $isRangeSelection,
    $insertNodes,
    $createParagraphNode,
    $isTextNode,
} from "lexical";
import { $setBlocksType } from "@lexical/selection";
import { TOGGLE_LINK_COMMAND } from "@lexical/link";
import {
    $createHeadingNode,
    $createQuoteNode,
    $isHeadingNode,
} from "@lexical/rich-text";
import { $createCodeNode } from "@lexical/code";
import {
    INSERT_ORDERED_LIST_COMMAND,
    INSERT_UNORDERED_LIST_COMMAND,
    REMOVE_LIST_COMMAND,
    $isListNode,
} from "@lexical/list";
import { $patchStyleText } from "@lexical/selection";
import { useCallback, useEffect, useState } from "react";
import {
    Bold,
    Italic,
    Underline,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    Undo,
    Redo,
    Link,
    Image as ImageIcon,
} from "lucide-react";

// --- UI Components ---
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { TooltipProvider } from "@/components/ui/tooltip";

// --- Custom Modules ---
import { editorTheme } from "@/components/editor/themes/editor-theme";
import { nodes } from "./nodes"; 
import { Plugins } from "./plugins"; 
import { $createImageNode } from "./nodes/ImageNode"; 

// --- Toolbar Component ---
function ToolbarPlugin() {
    const [editor] = useLexicalComposerContext();
    const [activeFormats, setActiveFormats] = useState({
        bold: false,
        italic: false,
        underline: false,
    });
    const [blockType, setBlockType] = useState("paragraph");
    const [elementFormat, setElementFormat] = useState<
        "left" | "center" | "right" | "justify"
    >("left");
    const [fontSize, setFontSize] = useState("16px");

    useEffect(() => {
        return editor.registerUpdateListener(({ editorState }) => {
            editorState.read(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                    // 1. Обновление состояния кнопок B, I, U
                    setActiveFormats({
                        bold: selection.hasFormat("bold"),
                        italic: selection.hasFormat("italic"),
                        underline: selection.hasFormat("underline"),
                    });

                    // 2. Определение типа текущего блока
                    const anchorNode = selection.anchor.getNode();
                    const element = anchorNode.getTopLevelElementOrThrow();
                    let type = element.getType();

                    if ($isListNode(element)) {
                        type = element.getListType(); // bullet или number
                    } else if ($isHeadingNode(element)) {
                        type = element.getTag(); // h1, h2, h3
                    }
                    setBlockType(type);

                    // 3. Обновление выравнивания
                    setElementFormat(
                        (element.getFormatType() as any) || "left"
                    );

                    // 4. Обновление размера шрифта
                    let currentFontSize = "16px";
                    const selectedNodes = selection.getNodes();
                    for (const node of selectedNodes) {
                        if ($isTextNode(node)) {
                            const style = node.getStyle();
                            const fsMatch = style.match(/font-size:\s*([^;]+)/);
                            if (fsMatch) {
                                currentFontSize = fsMatch[1];
                                break;
                            }
                        }
                    }
                    setFontSize(currentFontSize);
                }
            });
        });
    }, [editor]);

    const formatBlock = useCallback(
        (type: string) => {
            if (blockType === type) return;

            editor.update(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                    if (type === "bullet") {
                        editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
                    } else if (type === "number") {
                        editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
                    } else {
                        // Если уходим из списка в обычный блок, нужно снять форматирование списка
                        if (blockType === "bullet" || blockType === "number") {
                            editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
                        }
                        
                        $setBlocksType(selection, () => {
                            switch (type) {
                                case "h1": return $createHeadingNode("h1");
                                case "h2": return $createHeadingNode("h2");
                                case "h3": return $createHeadingNode("h3");
                                case "quote": return $createQuoteNode();
                                case "code": return $createCodeNode();
                                default: return $createParagraphNode();
                            }
                        });
                    }
                }
            });
        },
        [editor, blockType]
    );

    const formatText = (format: "bold" | "italic" | "underline") => {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
    };

    const formatElement = (align: "left" | "center" | "right" | "justify") => {
        editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, align);
    };

    const applyFontSize = useCallback(
        (size: string) => {
            editor.update(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                    $patchStyleText(selection, { "font-size": size });
                }
            });
        },
        [editor]
    );

    const insertLink = () => {
        const url = prompt("Введите URL:");
        if (url) {
            editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
        }
    };

    const insertImage = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = async () => {
            const file = input.files?.[0];
            if (file) {
                const formData = new FormData();
                formData.append("file", file);
                try {
                    const res = await fetch("/api/admin/upload-image", {
                        method: "POST",
                        body: formData,
                    });
                    const data = await res.json();
                    const storedPath = data.path ?? null;
                    const previewHref = data.href ?? data.url ?? null;

                    const srcToUse = storedPath || previewHref;
                    if (srcToUse) {
                        editor.update(() => {
                            const imageNode = $createImageNode(storedPath || srcToUse, file.name, previewHref);
                            $insertNodes([imageNode, $createParagraphNode()]);
                        });
                    }
                } catch (error) {
                    console.error("Error uploading image:", error);
                }
            }
        };
        input.click();
    };

    return (
        <div className="flex flex-wrap items-center gap-1 border-b p-2 bg-muted/50 sticky top-0 z-10">
            <Select value={blockType} onValueChange={formatBlock}>
                <SelectTrigger className="w-[140px] h-8">
                    <SelectValue placeholder="Format" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="paragraph">Paragraph</SelectItem>
                    <SelectItem value="h1">Heading 1</SelectItem>
                    <SelectItem value="h2">Heading 2</SelectItem>
                    <SelectItem value="h3">Heading 3</SelectItem>
                    <SelectItem value="bullet">Bullet List</SelectItem>
                    <SelectItem value="number">Numbered List</SelectItem>
                    <SelectItem value="quote">Quote</SelectItem>
                    <SelectItem value="code">Code Block</SelectItem>
                </SelectContent>
            </Select>

            <div className="h-6 w-[1px] bg-border mx-1" />

            <Select value={elementFormat} onValueChange={formatElement}>
                <SelectTrigger className="w-[110px] h-8">
                    <SelectValue placeholder="Align" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="left"><div className="flex items-center gap-2"><AlignLeft className="h-4 w-4" /> Left</div></SelectItem>
                    <SelectItem value="center"><div className="flex items-center gap-2"><AlignCenter className="h-4 w-4" /> Center</div></SelectItem>
                    <SelectItem value="right"><div className="flex items-center gap-2"><AlignRight className="h-4 w-4" /> Right</div></SelectItem>
                    <SelectItem value="justify"><div className="flex items-center gap-2"><AlignJustify className="h-4 w-4" /> Justify</div></SelectItem>
                </SelectContent>
            </Select>

            <div className="h-6 w-[1px] bg-border mx-1" />

            <Select value={fontSize} onValueChange={applyFontSize}>
                <SelectTrigger className="w-[90px] h-8">
                    <SelectValue placeholder="Size" />
                </SelectTrigger>
                <SelectContent>
                    {["12px", "14px", "16px", "18px", "20px", "24px", "30px"].map(size => (
                        <SelectItem key={size} value={size}>{size}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <div className="h-6 w-[1px] bg-border mx-1" />

            <div className="flex items-center gap-0.5">
                <Button
                    variant={activeFormats.bold ? "outline" : "ghost"}
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => formatText("bold")}
                >
                    <Bold className="h-4 w-4" />
                </Button>
                <Button
                    variant={activeFormats.italic ? "outline" : "ghost"}
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => formatText("italic")}
                >
                    <Italic className="h-4 w-4" />
                </Button>
                <Button
                    variant={activeFormats.underline ? "outline" : "ghost"}
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => formatText("underline")}
                >
                    <Underline className="h-4 w-4" />
                </Button>
            </div>

            <div className="h-6 w-[1px] bg-border mx-1" />

            <div className="flex items-center gap-0.5">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={insertLink}><Link className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={insertImage}><ImageIcon className="h-4 w-4" /></Button>
            </div>

            <div className="h-6 w-[1px] bg-border mx-1 ml-auto" />

            <div className="flex items-center gap-0.5">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}><Undo className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}><Redo className="h-4 w-4" /></Button>
            </div>
        </div>
    );
}

export function Editor({
    editorState,
    editorSerializedState,
    onChange,
    onSerializedChange,
}: {
    editorState?: EditorState;
    editorSerializedState?: SerializedEditorState;
    onChange?: (editorState: EditorState) => void;
    onSerializedChange?: (editorSerializedState: SerializedEditorState) => void;
}) {
    const initialConfig: InitialConfigType = {
        namespace: "Editor",
        theme: editorTheme,
        nodes: nodes,
        onError: (error: Error) => console.error(error),
        editorState: editorSerializedState 
            ? JSON.stringify(editorSerializedState) 
            : editorState,
    };

    return (
        <div className="bg-background relative rounded-lg border shadow-sm w-full">
            <LexicalComposer initialConfig={initialConfig}>
                <TooltipProvider>
                    <ToolbarPlugin />
                    <div className="relative">
                        <Plugins />
                    </div>
                    <OnChangePlugin
                        ignoreSelectionChange={true}
                        onChange={(state) => {
                            onChange?.(state);
                            onSerializedChange?.(state.toJSON());
                        }}
                    />
                </TooltipProvider>
            </LexicalComposer>
        </div>
    );
}