import type { Api } from "bymx-core/types";

let socketConnectionId = "";
let shouldConnect = false;
let workingListeners = 0;
let socket: WebSocket;

const canDisconnect = () => workingListeners === 0;

const handleConnection = function () {
    if (!socket) return;
    if (window.document.visibilityState === "hidden") {
        if (socket.readyState === socket.OPEN && canDisconnect()) {
            socket.close();
        }
    }
    else if (shouldConnect && socket.readyState === socket.CLOSED)
        connect();
};

if ('window' in globalThis)
    window.setInterval(handleConnection, 30e3);

const connect = () => {
    if ('window' in globalThis) {

        socket = new WebSocket(`${window.location.hostname === "localhost" ? "ws" : "wss"}://${window.location.host}/api/v1/ws`);

        window.document.addEventListener("visibilitychange", handleConnection);

        socket.addEventListener("message", (event: MessageEvent) => {
            const data = JSON.parse(event.data) as Api.WebSocket.HelloResponse;

            if (data.name === "helloResponse") {
                socketConnectionId = data.value.connectionId;
            }
        });
    }
};

export const socketManager = () => {
    shouldConnect = true;
    connect();

    const registerPromptResultHandler = (requestId: string, reader: (result: Api.WebSocket.SubmitPromptResult['value']) => undefined | { closeListener?: true }) => {
        workingListeners++;
        const handler = (event: MessageEvent) => {
            const data = JSON.parse(event.data) as Api.WebSocket.SubmitPromptResult;

            if (data.name === "promptResult") {
                if (requestId && requestId === data.value.clientRequestId) {
                    const shouldCloseListener = reader(data.value);
                    if (shouldCloseListener?.closeListener) {
                        workingListeners--;
                        socket.removeEventListener("message", handler);
                    }
                }
            }
        };
        socket.addEventListener("message", handler);
    };

    return {
        getConnectionId: () => socketConnectionId || undefined,
        registerPromptResultHandler
    };
};
