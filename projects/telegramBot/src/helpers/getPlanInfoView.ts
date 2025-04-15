import emojiIcon from "./emojiIcon.js";
import { config } from "bymx-core/server";
import { stringHelper } from "bymx-core/shared";
import type { PlanEntity } from "bymx-core/types";
import type { RequestContext } from "../types/telegram.js";

export default function (context: RequestContext, plan: PlanEntity.Plan) {
    const pointAmount = stringHelper.digitLocalization(stringHelper.thousandSeparator(plan.points), context.user.lang);
    const days = stringHelper.digitLocalization(plan.days, context.user.lang);
    const price = (
        context.uiText._langCode === "fa"
         ? `${stringHelper.digitLocalization(stringHelper.thousandSeparator(plan.price * config.usdToIrtMultiplier), context.user.lang)} ${context.uiText.irt}`
         : `$${stringHelper.digitLocalization(stringHelper.thousandSeparator(plan.price), context.user.lang)} USD`
    );
    const title = `${emojiIcon.extraPoint} ${context.getUit(plan.title)}`;
    const caption = `${emojiIcon.point} ${pointAmount} / ${emojiIcon.calendar} ${days} ${context.uiText.planDays} / ${emojiIcon.price} ${price}`;

    const fullInfo = (
        title
        + `\n${emojiIcon.point} ${context.uiText.pointsAmount}: ${pointAmount}`
        + `\n${emojiIcon.calendar} ${context.uiText.subscriptionPeriod}: ${days} ${context.uiText.days}`
        + `\n${emojiIcon.price} ${context.uiText.price}: ${price}`
    );

    return {
        plan,
        pointAmount, days, price, caption,
        fullInfo, title,
    };
}
