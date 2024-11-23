export const openAiSupportedFileExtensions = Object.freeze({
    fileSearch: Object.freeze([
        "pdf"
    ]),
    plainTexts: Object.freeze([
        "txt",
        "js", "mjs", "ts",
        "css",
        "go",
        "json",
        "csproj", "cs",
        "cc",
        "java",
    ]),
    mimeTypeFileExtensionMap: Object.freeze({
        "text/plain": "txt",
        "text/x-python": "py",
        "text/css": "css",
        "text/html": "html",
        "application/json": "json",
        "application/javascript": "js",
    } as { [Key: string]: string | undefined })
});
