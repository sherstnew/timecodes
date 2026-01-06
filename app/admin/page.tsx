"use client";

import { useState, useRef, useMemo } from "react";
import Player from "@/components/ui/player";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Timecode } from "@/lib/types";
import EditorRenderer from "@/components/blocks/editor-00/renderer";

import { Editor } from "@/components/blocks/editor-00/editor";

export default function Admin() {
    const [unlocked, setUnlocked] = useState(false);
    const [password, setPassword] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const playerRef = useRef<any>(null);
    const [pending, setPending] = useState(false);

    const [draftTimecodes, setDraftTimecodes] = useState<Timecode[]>([]);
    const [editing, setEditing] = useState<null | Timecode>(null);
    const [title, setTitle] = useState("");
    const [text, setText] = useState("");

    const canSubmit = useMemo(
        () => !!file && draftTimecodes.length > 0,
        [file, draftTimecodes]
    );

    async function unlock() {
        const res = await fetch("/api/admin/check", {
            method: "POST",
            body: JSON.stringify({ password }),
        });
        if (res.ok) setUnlocked(true);
    }

    function onSelectFile(e: React.ChangeEvent<HTMLInputElement>) {
        const f = e.target.files?.[0] ?? null;
        setFile(f);
        if (f) setPreviewUrl(URL.createObjectURL(f));
    }

    function onCreateTimecode(time: number) {
        const newTc: Timecode = {
            _id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            timeStart: Math.floor(time),
            timeEnd: Math.floor(time) + 5,
            title: "",
            text: "",
        };
        setEditing(newTc);
    }

    function saveDraft() {
        if (!editing) return;
        const filled: Timecode = { ...editing, title, text };
        setDraftTimecodes((s) => [...s, filled]);
        setEditing(null);
        setTitle("");
        setText("");
    }

    function adjustEnd(delta: number) {
        if (!editing) return;
        setEditing({
            ...editing,
            timeEnd: Math.max(
                0,
                (editing.timeEnd ?? editing.timeStart) + delta
            ),
        });
    }

    async function submitMarkup() {
        if (!file) return;
        setPending(true);
        const form = new FormData();
        form.append("file", file);
        form.append(
            "metadata",
            JSON.stringify({ title: file.name, timecodes: draftTimecodes })
        );
        const res = await fetch("/api/admin/create", {
            method: "POST",
            body: form,
            headers: {
                "x-admin-password": password,
            },
        });
        setPending(false);
        if (res.ok) {
            setFile(null);
            setPreviewUrl(null);
            setDraftTimecodes([]);
        }
    }

    return (
        <main className="p-6">
            {!unlocked ? (
                <div className="max-w-md">
                    <h2 className="text-xl font-medium mb-3">Админка</h2>
                    <Input
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Пароль"
                    />
                    <div className="mt-3">
                        <Button onClick={unlock}>Войти</Button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <section>
                        <h3 className="font-medium mb-2">Видео</h3>
                        <Input
                            type="file"
                            accept="video/*"
                            onChange={onSelectFile}
                        />
                        <div className="mt-4">
                            {previewUrl && (
                                <Player
                                    ref={playerRef}
                                    src={previewUrl}
                                    onCreateTimecode={onCreateTimecode}
                                />
                            )}
                        </div>
                    </section>

                    <section>
                        <h3 className="font-medium mb-2">Таймкоды</h3>
                        <div className="space-y-3">
                            {draftTimecodes.map((tc) => (
                                <div
                                    key={tc._id}
                                    className="p-3 border rounded"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="font-medium">
                                            {tc.title || "(без названия)"}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            {String(
                                                Math.floor(tc.timeStart / 60)
                                            ).padStart(2, "0")}
                                            :
                                            {String(
                                                Math.floor(tc.timeStart % 60)
                                            ).padStart(2, "0")}{" "}
                                            -{" "}
                                            {String(
                                                Math.floor(tc.timeEnd / 60)
                                            ).padStart(2, "0")}
                                            :
                                            {String(
                                                Math.floor(tc.timeEnd % 60)
                                            ).padStart(2, "0")}
                                        </div>
                                    </div>
                                    <div className="mt-2 text-sm text-muted-foreground">
                                        <EditorRenderer serialized={tc.text} />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {editing && (
                            <div className="mt-4 p-4 border rounded">
                                <div className="flex gap-2 items-center mb-2">
                                    <div>Начало: {editing.timeStart}с</div>
                                    <div className="ml-auto">
                                        Конец: {editing.timeEnd}с
                                    </div>
                                </div>
                                <div className="flex gap-2 mb-2">
                                    <Button onClick={() => adjustEnd(-5)}>
                                        -5с
                                    </Button>
                                    <Button onClick={() => adjustEnd(5)}>
                                        +5с
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            if (playerRef.current)
                                                playerRef.current.setCurrentTime(
                                                    editing.timeStart
                                                );
                                        }}
                                    >
                                        К началу
                                    </Button>
                                </div>
                                <div className="mb-2">
                                    <Input
                                        placeholder="Название"
                                        value={title}
                                        onChange={(e) =>
                                            setTitle(e.target.value)
                                        }
                                    />
                                </div>
                                <div className="mb-2">
                                    <Editor
                                        editorState={
                                            text ? JSON.parse(text) : undefined
                                        }
                                        onSerializedChange={(s) =>
                                            setText(JSON.stringify(s))
                                        }
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Button onClick={saveDraft}>
                                        Сохранить
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        onClick={() => setEditing(null)}
                                    >
                                        Отмена
                                    </Button>
                                </div>
                            </div>
                        )}

                        <div className="mt-6">
                            <Button
                                onClick={submitMarkup}
                                disabled={!canSubmit || pending}
                            >
                                {pending ? "Сохраняем..." : "Сохранить"}
                            </Button>
                        </div>
                    </section>
                </div>
            )}
        </main>
    );
}
