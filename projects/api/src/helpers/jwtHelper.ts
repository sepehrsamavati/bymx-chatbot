import jwt from "jsonwebtoken";

export const signToken = async (payload: object, secret: string, lifespan: number) => new Promise<string>(resolve => {
    resolve(
        jwt.sign({ _data: payload }, secret, {
            expiresIn: lifespan
        })
    );
});

export const validateToken = (token: string, secret: string) => new Promise<unknown>(resolve => {
    jwt.verify(token, secret, (err, payload) => {
        if (err) return resolve(undefined);

        if (typeof payload === "object" && payload && '_data' in payload)
            return resolve(payload._data);

        resolve(payload);
    });
});
