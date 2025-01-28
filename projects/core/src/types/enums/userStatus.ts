export enum UserStatus {
    /** Everything normal - No action needed */
    OK = 0,
    /** User should accept ToS/EULA */
    EULA = 1,
    /** User should provide phone number */
    PhoneNumber = 2,
    /** User blocked the bot */
    Blocked = 3,

    /** User is banned from the bot */
    Banned = 10,
}