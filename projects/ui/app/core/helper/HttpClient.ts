enum HttpMethods {
    GET, POST, PUT, PATCH, DELETE
}

interface IOptions {
    path: string;
    method?: HttpMethods;
    body?: any;
    jsonConvert?: boolean;
    formData?: boolean;
    ignoreEmptyStrings?: boolean;
}

type RequestResult<T> = {
    result: T;
    status: number;
};

type RequestConfig = {
    readonly requestPath: string;
    readonly requestOptions: RequestInit;
    readonly options: IOptions;
};

/** @todo Use search params */
const createQueryString = (data: any) => {
    return Object.keys(data).map(key => {
        let val = data[key]
        if (val !== null && typeof val === 'object') val = JSON.stringify(val)
        return `${key}=${encodeURIComponent(`${val}`.replace(/\s/g, '_'))}`
    }).join('&')
}

export default abstract class HttpClient {
    static readonly Methods = HttpMethods;

    static async send<ResponseType>(options: IOptions) {
        let result: RequestResult<ResponseType> | null = null;
        const config = this.generateRequestConfig(options);

        for (let tryNumber = 1; tryNumber <= 3; tryNumber++) {
            result = await this._send<ResponseType>(config);
            if (![401, 403, 500, 504].includes(result.status))
                break;
            else
                await new Promise(r => setTimeout(r, 1e3));
        }

        return result as RequestResult<ResponseType>;
    }

    /** This function may manipulate input object because of reference type value and should get called once before retries */
    private static generateRequestConfig(options: IOptions): RequestConfig {
        const defaultOptions = {
            method: HttpMethods.GET,
            jsonConvert: true,
            formData: false,
            ignoreEmptyStrings: false
        } as const satisfies Partial<IOptions>;

        const fetchOptions: RequestInit = {
            method: HttpMethods[options.method ?? defaultOptions.method],
            redirect: "follow"
        };

        const headers = new Headers();

        fetchOptions.headers = headers;

        if (options.body && fetchOptions.method) {
            if (options.ignoreEmptyStrings ?? defaultOptions.ignoreEmptyStrings) {
                Object
                    .entries(options.body)
                    .forEach(([key, value]) => {
                        if (value === '') {
                            delete options.body[key];
                        }
                    });
            }

            if (["GET", "DELETE"].includes(fetchOptions.method)) {
                if (options.body)
                    options.path += '?' + createQueryString(options.body);
            } else {
                if (options.formData) {
                    const formData = new FormData();
                    for (const key in options.body) {
                        const value = options.body[key];

                        if (value === undefined)
                            continue;

                        if (typeof value !== "object" || value instanceof File)
                            formData.append(key, value);
                        else {
                            if (Array.isArray(value)) {
                                value.forEach((v, index) => {
                                    formData.set(`${key}[${index}]`, v);
                                });
                            }
                        }
                    }
                    fetchOptions.body = formData;
                    // headers.append('Content-Type', 'multipart/form-data');
                } else {
                    fetchOptions.body = JSON.stringify(options.body);
                    headers.append('Content-Type', 'application/json');
                }
            }
        }

        return {
            requestPath: options.path,
            requestOptions: fetchOptions,
            options: {
                ...options,
                jsonConvert: options.jsonConvert ?? defaultOptions.jsonConvert
            }
        };
    }

    private static async _send<ResponseType>(config: RequestConfig): Promise<RequestResult<ResponseType>> {
        const rawResponse = await fetch(config.requestPath, config.requestOptions);

        if (rawResponse.redirected && rawResponse.url) {
            window.location.href = rawResponse.url;
        }

        if (!rawResponse.status.toString().startsWith('2') && ![401, 500].includes(rawResponse.status))
            console.table({
                title: "Request error",
                statusCode: rawResponse.status,
                status: rawResponse.statusText,
                method: config.requestOptions.method,
                path: config.requestPath
            });

        if (rawResponse.status === 401)
            window.location.pathname = '/login';

        if (rawResponse.status === 500)
            console.warn({
                type: 'warn',
                text: ""
            });

        if (config.options.jsonConvert === true && rawResponse.status === 200) {
            const dto = await rawResponse.json();
            return {
                result: dto as ResponseType,
                status: 200
            };
        }

        return {
            result: await rawResponse.text() as ResponseType,
            status: rawResponse.status
        };
    }
}