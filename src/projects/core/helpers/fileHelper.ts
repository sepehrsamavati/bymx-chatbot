export const openAiSupportedFileExtensions = Object.freeze({
    fileSearch: Object.freeze([
        "pdf"
    ]),
    plainTexts: Object.freeze([
        "txt",
        "js", "mjs", "ts", "jsx", "tsx",
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
        // "image/png": "png",
        // "image/jpeg": "jpg",
        "text/css": "css",
        "text/html": "html",
        "application/json": "json",
        "application/javascript": "js",
    } as { [Key: string]: string | undefined })
});
