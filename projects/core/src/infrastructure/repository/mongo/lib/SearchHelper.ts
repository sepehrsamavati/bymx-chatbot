export default abstract class MongoSearchHelper {
    static #escape(value: string) {
        return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /** Case insensitive */
    static string(value: string) {
        return { $regex: MongoSearchHelper.#escape(value), $options: "i" };
    }

    static exactStringCaseInsensitive(value: string) {
        const regex = new RegExp(`^${MongoSearchHelper.#escape(value)}$`, 'i');
        return { $regex: regex };
    }
}