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

type DocumentInfo = {
    fileExtension: string;
    isSupported: boolean;
    isPlainText: boolean;
    isFileSearch: boolean;
    fileName: string;
}

export const getFileSupportInfo = (opts: {
    fileName: string | undefined;
    mimeType: string | undefined;
}): DocumentInfo => {
    let { fileName, mimeType } = opts;

    fileName ??= "";
    mimeType ??= "";

    let tempExtension = openAiSupportedFileExtensions.mimeTypeFileExtensionMap[mimeType] ?? "";

    if (!tempExtension) // read extension from file name
        tempExtension = fileName?.split('.').pop() as string;

    const isFileSearch = openAiSupportedFileExtensions.fileSearch.includes(tempExtension);
    const isPlainText = openAiSupportedFileExtensions.plainTexts.includes(tempExtension);

    const isSupported = isFileSearch || isPlainText;

    return {
        fileName,
        isFileSearch, isPlainText, isSupported,
        fileExtension: tempExtension,
    };
}
