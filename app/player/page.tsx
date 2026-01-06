"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Timecode } from "@/lib/types";
import { timecodes } from "@/lib/timecodes";
import { Button } from "@/components/ui/button";
import { PlayIcon } from "@/components/ui/play";
import { PauseIcon } from "@/components/ui/pause";
import { MinimizeIcon } from "@/components/ui/minimize";
import { MaximizeIcon } from "@/components/ui/maximize";
import { Progress } from "@/components/ui/progress";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { CircleAlert } from "lucide-react";

export default function Player() {
    const duration = 30;
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [currentTime, setCurrentTime] = useState(26);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isPaused, setIsPaused] = useState(true);

    const currentTimecodes = useMemo<Timecode[]>(() => {
        return timecodes.filter(
            (timecode) =>
                timecode.timeStart <= currentTime &&
                timecode.timeEnd >= currentTime
        );
    }, [currentTime]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const onTimeUpdate = () => setCurrentTime(video.currentTime ?? 0);
        const onEnded = () => {
            setIsPaused(true);
            setCurrentTime(video.duration ?? video.currentTime ?? 0);
        };

        video.addEventListener("timeupdate", onTimeUpdate);
        video.addEventListener("ended", onEnded);

        return () => {
            video.removeEventListener("timeupdate", onTimeUpdate);
            video.removeEventListener("ended", onEnded);
        };
    }, []);

    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape" && document.fullscreenElement) {
                document.exitFullscreen();
                setIsFullscreen(false);
            }
        }

        function onFullscreenChange() {
            setIsFullscreen(
                document.fullscreenElement === containerRef.current
            );
        }

        window.addEventListener("keydown", onKeyDown);
        document.addEventListener("fullscreenchange", onFullscreenChange);

        return () => {
            window.removeEventListener("keydown", onKeyDown);
            document.removeEventListener(
                "fullscreenchange",
                onFullscreenChange
            );
        };
    }, []);

    return (
        <main className="w-full h-full flex p-3 gap-5 flex-col">
            <div className="w-full relative" ref={containerRef}>
                <Accordion
                    type="multiple"
                    className="flex flex-col absolute top-5 right-5 z-50 bg-white px-3 rounded-lg w-1/2 lg:w-1/3 max-h-3/5 lg:max-h-4/5 overflow-y-auto"
                    style={{ scrollbarGutter: "stable" }}
                    onClick={() => {
                        setIsPaused(true);
                        videoRef.current?.pause();
                    }}
                >
                    {currentTimecodes.map((timecode) => (
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
                                {timecode.text}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>

                <video
                    src="sample/example.webm"
                    className="w-full rounded-xl"
                    ref={videoRef}
                    onClick={() => {
                        if (isPaused) {
                            videoRef.current?.play();
                        } else {
                            videoRef.current?.pause();
                        }
                        setIsPaused(!isPaused);
                    }}
                ></video>
                <section className="flex absolute w-full px-5 bottom-5 z-50 items-center gap-3">
                    <Button
                        className="size-9"
                        onClick={() => {
                            if (isPaused) {
                                videoRef.current?.play();
                            } else {
                                videoRef.current?.pause();
                            }
                            setIsPaused(!isPaused);
                        }}
                    >
                        {isPaused ? <PlayIcon /> : <PauseIcon />}
                    </Button>
                    <div className="bg-primary text-white h-9 px-3 rounded-md font-mono flex items-center justify-start">
                        {String(Math.floor(currentTime / 60)).padStart(2, "0")}:
                        {String(Math.floor(currentTime % 60)).padStart(2, "0")}
                    </div>
                    <Progress
                        className="flex-1"
                        value={(currentTime / duration) * 100}
                        max={100}
                        onClick={(evt) => {
                            const target = evt.currentTarget;
                            const rect = target.getBoundingClientRect();
                            const clickX = evt.clientX - rect.left;
                            const progressWidth = rect.width;

                            if (progressWidth > 0) {
                                const newTime =
                                    (clickX / progressWidth) * duration;
                                if (videoRef.current) {
                                    videoRef.current.currentTime = newTime;
                                    setCurrentTime(newTime);
                                }
                            }
                        }}
                    />
                    <Button
                        className="size-9"
                        onClick={() => {
                            if (isFullscreen) {
                                document.exitFullscreen();
                                setIsFullscreen(false);
                            } else {
                                containerRef.current?.requestFullscreen();
                                setIsFullscreen(true);
                            }
                        }}
                    >
                        {isFullscreen ? <MinimizeIcon /> : <MaximizeIcon />}
                    </Button>
                </section>
            </div>
            <div className="flex flex-col h-full">
                <header className="font-medium text-xl">Таймкоды</header>
                <Accordion className="flex flex-col mt-3" type="multiple">
                    {timecodes.map((timecode) => (
                        <AccordionItem value={timecode._id} key={timecode._id}>
                            <AccordionTrigger>
                                {String(
                                    Math.floor(timecode.timeStart / 60)
                                ).padStart(2, "0")}
                                :
                                {String(
                                    Math.floor(timecode.timeStart % 60)
                                ).padStart(2, "0")}{" "}
                                -{" "}
                                {String(
                                    Math.floor(timecode.timeEnd / 60)
                                ).padStart(2, "0")}
                                :
                                {String(
                                    Math.floor(timecode.timeEnd % 60)
                                ).padStart(2, "0")}{" "}
                                {timecode.title}
                            </AccordionTrigger>
                            <AccordionContent className='flex flex-col'>
                                <Button
                                    onClick={() => {
                                        if (videoRef.current) {
                                            videoRef.current.currentTime =
                                                timecode.timeStart;
                                            videoRef.current.play();
                                            setIsPaused(false);
                                        }
                                    }}
                                    className='w-fit mb-3'
                                    variant="outline"
                                >
                                    Перейти к таймкоду
                                </Button>
                                <span>{timecode.text}</span>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </div>
        </main>
    );
}
