export type IJob = {
    readonly name: string;
    intervalMs: number;
    start: () => void;
    stop: () => void;
}