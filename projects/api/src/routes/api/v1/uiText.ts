import type { RouteHandlerMethod } from "fastify";
import { OperationResultWithData, UIText } from "bymx-core/shared";

export const getLanguageData: RouteHandlerMethod = async (request, reply) => {

    const result = new OperationResultWithData<UIText.UITextLanguage>();

    const { langCode } = request.params as { langCode: UIText.LangCode };

    if (typeof langCode !== "string" || !UIText.langCodes.includes(langCode))
        return reply.status(400).send(result.failed("Invalid language code"));

    result.succeeded().setData(UIText.default[langCode]);

    return reply.status(200).send(result);

};
