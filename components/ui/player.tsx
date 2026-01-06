"use client";

import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { PlayIcon } from "@/components/ui/play";
import { PauseIcon } from "@/components/ui/pause";
import { MinimizeIcon } from "@/components/ui/minimize";
import { MaximizeIcon } from "@/components/ui/maximize";
import { Progress } from "@/components/ui/progress";

export type PlayerHandle = {
    getCurrentTime: () => number;
    setCurrentTime: (t: number) => void;
    play: () => void;
    pause: () => void;
};

type Props = {
    src?: string;
    className?: string;
    onCreateTimecode?: (time: number) => void;
    showCreateButton?: boolean;
    onTimeChange?: (t: number) => void;
};

const Player = forwardRef<PlayerHandle, Props>(({ src, className, onCreateTimecode, showCreateButton = true, onTimeChange }, ref) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [isPaused, setIsPaused] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [autoHideControls, setAutoHideControls] = useState(true);
    const [showControls, setShowControls] = useState(true);
    const hideTimeout = useRef<number | null>(null);

    useImperativeHandle(ref, () => ({
        getCurrentTime: () => videoRef.current?.currentTime ?? 0,
        setCurrentTime: (t: number) => {
            if (videoRef.current) videoRef.current.currentTime = t;
            setCurrentTime(t);
        },
        play: () => {
            if (videoRef.current) {
                videoRef.current.play();
                setIsPaused(false);
            }
        },
        pause: () => {
            if (videoRef.current) {
                videoRef.current.pause();
                setIsPaused(true);
            }
        },
    }));

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        const onTime = () => {
            const t = video.currentTime ?? 0;
            setCurrentTime(t);
            onTimeChange?.(t);
        };
        const onLoaded = () => setDuration(video.duration ?? 0);
        video.addEventListener("timeupdate", onTime);
        video.addEventListener("loadedmetadata", onLoaded);
        return () => {
            video.removeEventListener("timeupdate", onTime);
            video.removeEventListener("loadedmetadata", onLoaded);
        };
    }, [src, onTimeChange]);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        function show() {
            setShowControls(true);
            if (hideTimeout.current) {
                window.clearTimeout(hideTimeout.current);
                hideTimeout.current = null;
            }
            if (autoHideControls) {
                hideTimeout.current = window.setTimeout(() => setShowControls(false), 2000);
            }
        }

        function hide() {
            if (autoHideControls) setShowControls(false);
        }

        function onMouseMove() {
            show();
        }

        el.addEventListener("mousemove", onMouseMove);
        el.addEventListener("mouseenter", show);
        el.addEventListener("mouseleave", hide);

        // initialize hide timer if enabled
        if (autoHideControls) {
            hideTimeout.current = window.setTimeout(() => setShowControls(false), 2000);
        }

        return () => {
            el.removeEventListener("mousemove", onMouseMove);
            el.removeEventListener("mouseenter", show);
            el.removeEventListener("mouseleave", hide);
            if (hideTimeout.current) {
                window.clearTimeout(hideTimeout.current);
                hideTimeout.current = null;
            }
        };
    }, [autoHideControls]);

    useEffect(() => {
        function onFullscreenChange() {
            const fe = document.fullscreenElement;
            const el = containerRef.current;
            const active = !!(
                fe &&
                el &&
                (fe === el || fe === el.parentElement || el.contains(fe) || (el.parentElement && el.parentElement.contains(fe)))
            );
            setIsFullscreen(active);
        }
        document.addEventListener("fullscreenchange", onFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
    }, []);

    return (
        <div className={("relative " + (className || "")).trim()} ref={containerRef}>
            <video
                ref={videoRef}
                src={src}
                className="w-full rounded-xl bg-black"
                onClick={() => {
                    if (isPaused) videoRef.current?.play();
                    else videoRef.current?.pause();
                    setIsPaused(!isPaused);
                }}
            />
            <section
                className={
                    "flex absolute w-full px-5 bottom-5 z-50 items-center gap-3 transition-opacity duration-200 " +
                    (showControls ? "opacity-100" : "opacity-0 pointer-events-none")
                }
            >
                <Button
                    onClick={() => {
                        if (isPaused) videoRef.current?.play();
                        else videoRef.current?.pause();
                        setIsPaused(!isPaused);
                    }}
                    className="size-9"
                >
                    {isPaused ? <PlayIcon /> : <PauseIcon />}
                </Button>

                <div className="bg-primary text-white h-9 px-3 rounded-md font-mono flex items-center justify-start">
                    {String(Math.floor(currentTime / 60)).padStart(2, "0")}:
                    {String(Math.floor(currentTime % 60)).padStart(2, "0")}
                </div>

                <Progress
                    className="flex-1"
                    value={duration ? (currentTime / duration) * 100 : 0}
                    max={100}
                    onClick={(evt) => {
                        const target = evt.currentTarget as HTMLElement;
                        const rect = target.getBoundingClientRect();
                        const clickX = evt.clientX - rect.left;
                        const progressWidth = rect.width;
                        if (progressWidth > 0 && videoRef.current) {
                            const newTime = (clickX / progressWidth) * (duration || 0);
                            videoRef.current.currentTime = newTime;
                            setCurrentTime(newTime);
                        }
                    }}
                />

                <Button
                    className="size-9 cursor-pointer"
                    onClick={() => {
                        if (isFullscreen) {
                            document.exitFullscreen();
                        } else {
                            // Prefer requesting fullscreen on the parent container (page layout wrapper)
                            const parent = containerRef.current?.parentElement ?? containerRef.current;
                            try {
                                parent?.requestFullscreen?.();
                            } catch (e) {
                                // fallback to container itself
                                containerRef.current?.requestFullscreen?.();
                            }
                        }
                    }}
                >
                    {isFullscreen ? <MinimizeIcon /> : <MaximizeIcon />}
                </Button> 

                {showCreateButton && (
                    <div className="ml-2">
                        <Button
                            onClick={() => onCreateTimecode?.(videoRef.current?.currentTime ?? 0)}
                            variant="secondary"
                        >
                            Создать таймкод
                        </Button>
                    </div>
                )}
            </section>
        </div>
    );
});

export default Player;
