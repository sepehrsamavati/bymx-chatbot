
const domain = 'localhost';
const sessionTokenFixedOptions = `Path=/; Secure; HttpOnly; SameSite=Lax; Domain=${domain};`;

export const createSetCookieString = (key: string, value: string, age: number) => `${key}=${value}; ${sessionTokenFixedOptions} Max-Age=${age}`;

export const extractCookies = (headerValue: string | null | undefined) => {
    if (typeof headerValue !== "string") return null;

    const cookieArray = headerValue.split(';');

    const cookies = cookieArray
        .map(cookie => {
            const [key, value] = cookie.split('=').map(item => item.trim());
            return { key, value };
        })
        .filter(cookie => cookie.key && cookie.value);

    return cookies;
};
