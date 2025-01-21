export const aiVoices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"] as const;

export type AIVoice = typeof aiVoices[number];
