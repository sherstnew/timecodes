"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Player from "@/components/ui/player";
import { Button } from "@/components/ui/button";
import {
    Accordion,
    AccordionItem,
    AccordionTrigger,
    AccordionContent,
} from "@/components/ui/accordion";
import EditorRenderer from "@/components/blocks/editor-00/renderer";
import { useRef, useMemo } from "react";
import { CircleAlert } from "lucide-react";

export default function PlayerPage() {
    const search = useSearchParams();
    const id = search?.get("id");
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const playerRef = useRef<any>(null);

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        fetch(`/api/markups/${id}`)
            .then((r) => r.json())
            .then((j) => {
                if (j?.error) {
                    setError(j.error);
                } else {
                    setData(j);
                }
            })
            .catch((e) => setError(String(e)))
            .finally(() => setLoading(false));
    }, [id]);

    function fmt(t: number) {
        return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(
            Math.floor(t % 60)
        ).padStart(2, "0")}`;
    }

    const currentTimecodes = useMemo(() => {
        if (!data?.timecodes) return [];
        return (data.timecodes as any[]).filter(
            (timecode) =>
                timecode.timeStart <= currentTime &&
                timecode.timeEnd >= currentTime
        );
    }, [data, currentTime]);

    return (
        <main className="w-full h-full flex p-3 gap-5 flex-col">
            <div className="w-full lg:w-3/4 relative">
                {loading && <div className="p-6">Загрузка видео...</div>}
                {error && <div className="p-6 text-red-600">{error}</div>}
                {data?.href && !loading && (
                    <>
                        <Player
                            ref={playerRef}
                            src={data.href}
                            showCreateButton={false}
                            onTimeChange={setCurrentTime}
                        />

                        <Accordion
                            type="multiple"
                            className="flex flex-col absolute top-5 right-5 z-50 bg-white px-3 rounded-lg w-1/2 lg:w-1/3 max-h-3/5 lg:max-h-4/5 overflow-y-auto"
                            style={{ scrollbarGutter: "stable" }}
                            onClick={() => {
                                playerRef.current?.pause?.();
                            }}
                        >
                            {currentTimecodes.map((timecode: any) => (
                                <AccordionItem
                                    value={timecode._id}
                                    key={timecode._id}
                                    className="w-full flex flex-col h-full"
                                >
                                    <AccordionTrigger>
                                        <div className="flex gap-2 justify-start items-center">
                                            <CircleAlert size={16} />
                                            <span>{timecode.title}</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pb-5">
                                        <EditorRenderer
                                            serialized={timecode.text}
                                        />
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </>
                )}
            </div>
            <div className="flex flex-col h-full">
                <header className="font-medium text-xl">Таймкоды</header>
                {loading ? (
                    <div className="p-4">Загрузка таймкодов...</div>
                ) : (
                    <Accordion className="flex flex-col mt-3" type="multiple">
                        {(data?.timecodes || []).map((timecode: any) => (
                            <AccordionItem
                                value={timecode._id}
                                key={timecode._id}
                            >
                                <AccordionTrigger>
                                    <div className="flex items-center justify-between w-full">
                                        <div className="text-sm text-muted-foreground mr-3">
                                            {fmt(timecode.timeStart)} -{" "}
                                            {fmt(timecode.timeEnd)}
                                        </div>
                                        <div className="flex-1 text-left">
                                            {timecode.title}
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="flex flex-col">
                                    <Button
                                        onClick={() => {
                                            if (playerRef.current) {
                                                playerRef.current.setCurrentTime(
                                                    timecode.timeStart
                                                );
                                                playerRef.current.play?.();
                                            }
                                        }}
                                        className="w-fit mb-3"
                                        variant="outline"
                                    >
                                        Перейти к таймкоду
                                    </Button>
                                    <EditorRenderer
                                        serialized={timecode.text}
                                    />
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                )}
            </div>
        </main>
    );
}
