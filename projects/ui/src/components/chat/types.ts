import type { UIText } from "bymx-core/shared";
import type { PromptViewModel } from "bymx-core/types";

export type ChatMessage = PromptViewModel & {
    attachmentFilename?: string;
};

export type SelectedAttachmentFile = {
    id?: string;
    /** 0-100 */
    uploadedAmount: number;
    name: string;
};

export enum ReadyPromptCategory {
    Coding = 1,
    Workout = 2,
    Cooking = 3,
    SummarizeText = 4,
}

export const autoScrollThreshold = 200;

export const acceptedFileExtensions = ".pdf,.txt,.js,.mjs,.ts,.jsx,.tsx,.css,.go,.json,.csproj,.cs,.cc,.java";

export const readyPromptCategoryToPromptsListMap: { [key in ReadyPromptCategory]: UIText.UITextKey[] } = {
    [ReadyPromptCategory.Coding]: ["_prompt_coding", "_prompt_codingPythonHttpServer"],
    [ReadyPromptCategory.Workout]: ["_prompt_workout", "_prompt_workoutAtHome"],
    [ReadyPromptCategory.Cooking]: ["_prompt_cooking", "_prompt_cookingPizza"],
    [ReadyPromptCategory.SummarizeText]: ["_prompt_summarizeText"],
};
