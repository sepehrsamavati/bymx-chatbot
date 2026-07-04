import { useCallback, useRef, useState } from "react";

export function useStreamChunks() {
    const chunksRef = useRef<(string | undefined)[]>([]);
    const [output, setOutput] = useState("");

    const reset = useCallback(() => {
        chunksRef.current = [];
        setOutput("");
    }, []);

    const appendChunk = useCallback((index: number, value: string) => {
        chunksRef.current[index] = value;
        setOutput(chunksRef.current.filter((chunk): chunk is string => typeof chunk === "string").join(""));
    }, []);

    return { output, appendChunk, reset };
}
