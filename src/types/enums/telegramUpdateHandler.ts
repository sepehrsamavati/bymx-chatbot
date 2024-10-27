export enum TelegramUpdateType {
    All = 0,
    Message = 1,
    TextMessage = 2,

    Media = 10,
    Photo = 11,
    Audio = 12,
    Voice = 13,
    Sticker = 14,
    Location = 15,
    Contact = 16,
    Document = 17,

    InlineQuery = 50,
    CallbackQuery = 51,
}

export enum HandlerType {
    /** Create and setup (DI scope, user auth, i18n, ...) */
    Initializer = 1,
    /** Custom middlewares after DI is ready and user is authenticated */
    Middleware = 5,
    /** Main tasks of the application */
    Operation = 20,
    /** Dispose DI, custom behavior after the task is done (log, ...) */
    Disposer = 30,
}
