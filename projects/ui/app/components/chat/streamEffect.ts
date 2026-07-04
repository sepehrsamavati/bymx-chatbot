export const streamEffects = ["none", "fade", "slide", "type"] as const;

export type StreamEffect = (typeof streamEffects)[number];

export const defaultStreamEffect: StreamEffect = "none";

export const typeEffectCharsPerSecond = 48;
