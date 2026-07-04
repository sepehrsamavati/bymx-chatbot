import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { type StreamEffect, typeEffectCharsPerSecond } from "./streamEffect";

type UseStreamingTextOptions = {
    isStreaming?: boolean;
    effect: StreamEffect;
};

export function useStreamingText(text: string, { isStreaming, effect }: UseStreamingTextOptions) {
    const [displayText, setDisplayText] = useState(text);
    const contentRef = useRef<HTMLDivElement>(null);
    const targetTextRef = useRef(text);
    const rafRef = useRef<number | undefined>(undefined);
    const lastFrameRef = useRef<number | undefined>(undefined);
    const visibleLengthRef = useRef(text.length);

    const activeEffect = isStreaming ? effect : "none";
    const isTyping = activeEffect === "type" && displayText.length < text.length;

    useEffect(() => {
        targetTextRef.current = text;

        if (!isStreaming || activeEffect === "none") {
            visibleLengthRef.current = text.length;
            setDisplayText(text);
            return;
        }

        if (activeEffect === "fade" || activeEffect === "slide") {
            visibleLengthRef.current = text.length;
            setDisplayText(text);
            return;
        }

        if (activeEffect === "type") {
            if (text.length < visibleLengthRef.current)
                visibleLengthRef.current = text.length;

            const tick = (timestamp: number) => {
                const target = targetTextRef.current;
                const lastFrame = lastFrameRef.current ?? timestamp;
                lastFrameRef.current = timestamp;

                const charsToAdd = Math.max(
                    1,
                    Math.floor(((timestamp - lastFrame) / 1000) * typeEffectCharsPerSecond),
                );

                visibleLengthRef.current = Math.min(
                    target.length,
                    visibleLengthRef.current + charsToAdd,
                );

                setDisplayText(target.slice(0, visibleLengthRef.current));

                if (visibleLengthRef.current < target.length)
                    rafRef.current = requestAnimationFrame(tick);
            };

            rafRef.current = requestAnimationFrame(tick);

            return () => {
                if (rafRef.current)
                    cancelAnimationFrame(rafRef.current);
                lastFrameRef.current = undefined;
            };
        }
    }, [text, isStreaming, activeEffect]);

    useLayoutEffect(() => {
        if (!isStreaming || (activeEffect !== "fade" && activeEffect !== "slide"))
            return;

        const element = contentRef.current;
        if (!element)
            return;

        element.classList.remove("stream-animate");
        void element.offsetWidth;
        element.classList.add("stream-animate");
    }, [text, isStreaming, activeEffect]);

    useEffect(() => () => {
        if (rafRef.current)
            cancelAnimationFrame(rafRef.current);
    }, []);

    return {
        displayText,
        contentRef,
        isTyping,
        activeEffect,
    };
}
