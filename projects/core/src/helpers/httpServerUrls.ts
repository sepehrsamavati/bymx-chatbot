import config from "../config.js";

const urls = {
    v1: {
        baseAddress: "/api/v1",
        tempFile: {
            path: "tempFile",
            createUrl: (id: string) => {
                const url = new URL(config.apiServer.baseAddress);
                url.pathname = urls.v1.baseAddress + "/" + urls.v1.tempFile.path + "/" + id;
                return url;
            }
        },
        falAiSetResult: {
            path: "setTaskResult/fal-ai",
            createUrl: (id: string) => {
                const url = new URL(config.apiServer.baseAddress);
                url.pathname = urls.v1.baseAddress + "/" + urls.v1.falAiSetResult.path + "/" + id;
                return url;
            }
        }
    }
};

export default urls;
