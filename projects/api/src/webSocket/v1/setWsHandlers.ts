import { randomUUID } from "node:crypto";
import { config, logger } from 'bymx-core/server';
import { Api, UserEntity } from 'bymx-core/types';
import type { WebSocket } from "@fastify/websocket";
import type { FastifyPluginCallback } from "fastify";
import { validateToken } from '../../helpers/jwtHelper.js';
import { extractCookies } from '../../helpers/cookieHelper.js';

type SocketConnectionContext = {
    id: string;
    socket: WebSocket;
    user: UserEntity.UserViewModel;
}

const socketStorage = new Map<string, SocketConnectionContext>();
const generateSocketId = () => randomUUID();

export const getSocketById = (id: string) => socketStorage.get(id);

export const setWsHandlers = (controller: Parameters<FastifyPluginCallback>['0']) => {

    controller
        .get("/", { websocket: true }, () => null);

    controller
        .websocketServer
        .on("connection", async (socket, request) => {
            const authToken = extractCookies(request.headers.cookie)?.find(c => c.key === config.apiServer.cookieKey)?.value;

            if (!authToken)
                return socket.close();

            const payload = await validateToken(authToken, config.apiServer.tokenSignSecret);

            if (!payload)
                return socket.close();

            const userViewModel = payload as UserEntity.UserViewModel;
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