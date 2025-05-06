import ChatPrompt from '../../dto/chat/ChatPrompt.js';
import type { Server as SocketIOServer } from 'socket.io';
import { OperationResultWithData } from 'bymx-core/shared';
import { validateToken } from '../../helpers/jwtHelper.js';
import { config, type CoreServices } from 'bymx-core/server';
import { extractCookies } from '../../helpers/cookieHelper.js';
import { dtoValidator } from '../../middlewares/dtoValidator.js';
import type { UserEntity, UserTempFileEntity } from 'bymx-core/types';

export const setSocketIoHandlers = (io: SocketIOServer, coreServices: CoreServices) => {
    io.on("connection", async socket => {
        const authToken = extractCookies(socket.request.headers.cookie)?.find(c => c.key === config.apiServer.cookieKey)?.value;

        if (!authToken)
            return socket.disconnect(true);

        const payload = await validateToken(authToken, config.apiServer.tokenSignSecret);

        if (!payload)
            return socket.disconnect(true);

        const userViewModel = payload as UserEntity.UserViewModel;
        const scope = coreServices.createApplicationScope();
        const applications = scope.applications;

        // const context = {
        //     scope,
        //     userViewModel,
        // };

        socket.once("disconnect", () => scope.dispose());

        socket.emit("hello");

        socket.on("submitPrompt", data => dtoValidator(ChatPrompt, data, async chatPrompt => {
            const reply = (data: unknown) => socket.emit("submitPromptResult", data);

            const result = new OperationResultWithData<{ outputChunk?: string; plainText?: string; isComplete: boolean; pointUsage: number; finished?: true; }>();

            const userId = userViewModel.id;
            const query = chatPrompt;
            const user = await applications.userApplication.getUserById(userId);

            if (!user)
                return reply(result.failed("userNotFound"));

            const chat = await applications.aiChatApplication.getUserChatById(user.id, query.chatId);

            if (!chat)
                return reply(result.failed("itemNotFound"));

            let attachmentFile: UserTempFileEntity.UserTempFile | null = null;

            if (query.attachmentFileId) {
                const file = await applications.userTempFileApplication.getByFsId(query.attachmentFileId);

                if (file.data?.user !== user.id)
                    return reply(result.failed("itemNotFound"));

                attachmentFile = file.data as UserTempFileEntity.UserTempFile;
            }

            const chatCompletionResult = await applications.aiApplication.multiModalChatCompletion({
                user,
                streamReader: (chunk, _finished) => {
                    reply(
                        result
                            .succeeded()
                            .setData({
                                pointUsage: 0,
                                isComplete: false,
                                outputChunk: chunk,
                            })
                    );
                },
                voiceResponse: false,
                attachment: {
                    file: attachmentFile,
                },
                inputMessage: {
                    text: query.promptText
                },
                history: {
                    chat: chat
                },
            });

            if (chatCompletionResult.ok && chatCompletionResult.data)
                result
                    .succeeded()
                    .setData({
                        isComplete: chatCompletionResult.data.isComplete,
                        plainText: chatCompletionResult.data.plainText,
                        pointUsage: chatCompletionResult.data.pointUsage,
                        finished: true,
                    });
            else
                result.failed(chatCompletionResult.message);

            return reply(result);
        }));
    });
};