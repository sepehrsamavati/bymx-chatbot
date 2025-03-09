import HttpClient from "../helper/HttpClient";

const chatService = Object.freeze({
    getAll() {
        return HttpClient.send<null>({
            path: "/api/v1/chat/all",
            method: HttpClient.Methods.GET,
        });
    },
});

export default chatService;
