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
    ChosenInlineResult = 52,
}
