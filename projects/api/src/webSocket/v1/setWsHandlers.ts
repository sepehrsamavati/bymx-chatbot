import { randomUUID } from "node:crypto";
import { config, logger } from 'bymx-core/server';
import { Api, UserEntity } from 'bymx-core/types';
import type { FastifyPluginCallback } from "fastify";
import { validateToken } from '../../helpers/jwtHelper.js';
import { extractCookies } from '../../helpers/cookieHelper.js';
import type { WebSocket, WebsocketHandler } from "@fastify/websocket";

type SocketConnectionContext = {
    id: string;
    socket: WebSocket;
    user: UserEntity.UserViewModel;
}

const socketStorage = new Map<string, SocketConnectionContext>();
const generateSocketId = () => randomUUID();
const MAX_CONNECTIONS_PER_USER = 5;

export const getSocketById = (id: string) => socketStorage.get(id);

export const setWsHandlers = (controller: Parameters<FastifyPluginCallback>['0']) => {

    controller
        .get("/", { websocket: true }, () => null);

    controller
        .websocketServer
        .on("connection", async (socket: Parameters<WebsocketHandler>[0], request: Parameters<WebsocketHandler>[1]) => {
            const authToken = extractCookies(request.headers.cookie)?.find(c => c.key === config.apiServer.cookieKey)?.value;

            if (!authToken)
                return socket.close();

            const payload = await validateToken(authToken, config.apiServer.tokenSignSecret);

            if (!payload)
                return socket.close();

            const userViewModel = payload as UserEntity.UserViewModel;

            const userCurrentConnections = [...socketStorage.values()].filter(connection => connection.user.id === userViewModel.id).length;

            if (userCurrentConnections + 1 > MAX_CONNECTIONS_PER_USER)
                return socket.close();

            // const scope = coreServices.createApplicationScope();
            // const applications = scope.applications;

            const socketId = generateSocketId();

            const context: SocketConnectionContext = {
                socket,
                id: socketId,
                user: userViewModel,
            };

            socketStorage.set(socketId, context);

            socket.once("close", () => {
                socketStorage.delete(socketId);
                // scope.dispose();
            });

            socket.send(JSON.stringify(
                {
                    name: "helloResponse",
                    value: {
                        connectionId: socketId
                    }
                } satisfies Api.WebSocket.HelloResponse
            ));
        });

    logger.info("Web socket listener attached");
};