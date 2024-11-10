export type IOpenAIService = {
    simpleMessage(input: string, userId: string): Promise<string | null>;
}