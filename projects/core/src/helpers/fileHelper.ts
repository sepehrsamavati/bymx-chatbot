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

export const falAiSupportedFileExtensions = Object.freeze({
    /**
     * 
     * @param inp Mimetype/Filename/Extension
     */
    isSupportedMinimaxMusicGen: (inp: string) => (
        [
            "wav",
            "mp3",
        ].includes(tryGetFileExtension(inp))
    ),
    /**
     * 
     * @param inp Mimetype/Filename/Extension
     */
    isSupportedImage: (inp: string) => (
        [
            "png",
            "jpg",
            "jpeg",
        ].includes(tryGetFileExtension(inp))
    ),
});

type DocumentInfo = {
    fileExtension: string;
    isSupported: boolean;
    isPlainText: boolean;
    isFileSearch: boolean;
    fileName: string;
}

/**
 * 
 * @param inp Mimetype/Filename/Extension
 * @returns Extension if valid or empty string if invalid
 */
export const tryGetFileExtension = (inp: string) => {
    let extension = "";

    // Filename
    if (inp.includes('.')) {
        extension = inp.split('.').pop() ?? "";
    }
    // Mimetype
    else if (inp.includes('/')) {
        extension = ({
            "audio/mpeg": "mp3",
            "audio/wav": "wav",
            "audio/wave": "wav",
            "text/plain": "txt",
            "text/x-python": "py",
            "image/png": "png",
            "image/jpeg": "jpg",
            "text/css": "css",
            "text/html": "html",
            "application/json": "json",
            "application/javascript": "js",
        })[inp] ?? "";
    } else if (inp.length < 10 && /^[a-zA-Z0-9]{1,5}$/.test(inp)) {
        extension = inp;
    }

    return extension;
};

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
