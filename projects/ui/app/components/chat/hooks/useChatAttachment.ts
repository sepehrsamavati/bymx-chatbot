import fileService from "~/core/services/fileService";
import type Session from "~/core/Session";
import { errorResponseMessageFormatter } from "~/core/helper/HttpClient";
import { useCallback, useState } from "react";
import type { IOperationResultWithData } from "bymx-core/types";
import { acceptedFileExtensions, type SelectedAttachmentFile } from "../types";

export function useChatAttachment(session: Session) {
    const [uploadingFile, setUploadingFile] = useState<SelectedAttachmentFile>();

    const uploadFile = useCallback((file: File) => {
        const formData = new FormData();
        formData.append("file", file);

        const xhr = new XMLHttpRequest();

        return new Promise<boolean>((resolve) => {
            xhr.upload.addEventListener("progress", event => {
                if (!event.lengthComputable) return;

                setUploadingFile(current => {
                    if (!current) return undefined;
                    return {
                        ...current,
                        uploadedAmount: Math.round((event.loaded / event.total) * 100),
                    };
                });
            });

            xhr.addEventListener("error", () => {
                setUploadingFile(undefined);
                session.snackbarProvider(session.uiText.errorOccurred, { variant: "error" });
            });

            xhr.addEventListener("loadend", () => {
                const res = xhr.getResponseHeader("content-type")?.includes("application/json")
                    ? JSON.parse(xhr.response) as IOperationResultWithData<string>
                    : null;

                errorResponseMessageFormatter(res);

                if (!(res && xhr.readyState === 4 && xhr.status === 200)) {
                    setUploadingFile(undefined);
                    session.snackbarProvider(res?.message || session.uiText.errorOccurred, {
                        variant: "error",
                        anchorOrigin: { horizontal: "center", vertical: "bottom" },
                    });
                    return resolve(false);
                }

                if (res.ok && typeof res.data === "string") {
                    setUploadingFile(current => {
                        if (!current) return undefined;
                        return { ...current, id: res.data! };
                    });
                }

                if (!res.ok) {
                    setUploadingFile(undefined);
                    session.snackbarProvider(res.message, { variant: "error" });
                }

                resolve(res.ok);
            });

            xhr.open("PUT", "/api/v1/file/upload", true);
            xhr.send(formData);
        });
    }, [session]);

    const deleteUploadedFile = useCallback(() => {
        if (!uploadingFile?.id) return;

        const fileId = uploadingFile.id;
        setUploadingFile(undefined);
        fileService.deleteAttachment(fileId);
    }, [uploadingFile]);

    const selectFile = useCallback((file: File) => {
        if (uploadingFile) return;

        const extensionIsSupported = acceptedFileExtensions
            .split(",")
            .filter(ext => ext.length > 0)
            .some(ext => file.name.toLowerCase().endsWith(ext));

        if (!extensionIsSupported) {
            session.snackbarProvider(session.uiText.fileNotSupported, {
                variant: "warning",
                anchorOrigin: { horizontal: "center", vertical: "bottom" },
            });
            return;
        }

        setUploadingFile({ name: file.name, uploadedAmount: 0 });
        uploadFile(file);
    }, [uploadFile, uploadingFile, session]);

    const clearAttachment = useCallback(() => setUploadingFile(undefined), []);

    return {
        uploadingFile,
        setUploadingFile,
        selectFile,
        deleteUploadedFile,
        clearAttachment,
    };
}
