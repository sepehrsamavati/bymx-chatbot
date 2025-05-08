import { randomUUID } from "node:crypto";
import { Api, UserEntity } from 'bymx-core/types';
import { validateToken } from '../../helpers/jwtHelper.js';
import { config, type CoreServices } from 'bymx-core/server';
import { extractCookies } from '../../helpers/cookieHelper.js';
import type { Socket, Server as SocketIOServer } from 'socket.io';

type SocketConnectionContext = {
    id: string;
    socket: Socket;
    user: UserEntity.UserViewModel;
}

const socketStorage = new Map<string, SocketConnectionContext>();
const generateSocketId = () => randomUUID();

export const getSocketById = (id: string) => socketStorage.get(id);

export const setSocketIoHandlers = (io: SocketIOServer, _coreServices: CoreServices) => {
    io.on("connection", async socket => {
        const authToken = extractCookies(socket.request.headers.cookie)?.find(c => c.key === config.apiServer.cookieKey)?.value;

        if (!authToken)
            return socket.disconnect(true);

        const payload = await validateToken(authToken, config.apiServer.tokenSignSecret);

        if (!payload)
            return socket.disconnect(true);

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

        socket.once("disconnect", () => {
            socketStorage.delete(socketId);
            // scope.dispose();
        });

        socket.emit("hello", (
            {
                connectionId: socketId,
            } satisfies Api.SocketIo.HelloResponse
        ));
    });
};