export const mimeTypeFileExtensionMap = Object.freeze({
    "text/plain": "txt",
    "text/x-python": "py",
    "image/png": "png",
    "image/jpeg": "jpg",
    "application/pdf": "pdf",
    "text/css": "css",
    "text/html": "html",
    "application/json": "json",
    "application/javascript": "js",
    "application/x-javascript": "js",
} as { [Key: string]: string | undefined });

export const extractableFileContentExtensions = Object.freeze([
    "pdf",
    "txt",
    "js", "mjs", "ts", "jsx", "tsx",
    "css",
    "go",
    "json",
    "csproj", "cs",
    "cc",
    "java",
]);

/** @deprecated */
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
    /** @deprecated Import 'mimeTypeFileExtensionMap' directly */
    mimeTypeFileExtensionMap,
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
    isExtractable: boolean;
    fileName: string;

    /** @deprecated */
    isSupported: boolean;
    /** @deprecated */
    isPlainText: boolean;
    /** @deprecated */
    isFileSearch: boolean;
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
            "application/x-javascript": "js",
        })[inp.trim()] ?? "";
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

    let tempExtension = mimeTypeFileExtensionMap[mimeType] ?? "";

    if (!tempExtension) // read extension from file name
        tempExtension = fileName?.split('.').pop() as string;

    const isExtractable = extractableFileContentExtensions.includes(tempExtension);

    return {
        fileName,
        isExtractable,
        fileExtension: tempExtension,

        isFileSearch: false,
        isPlainText: false,
        isSupported: isExtractable,
    };
}
