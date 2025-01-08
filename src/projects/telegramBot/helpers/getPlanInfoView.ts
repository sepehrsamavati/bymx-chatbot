import emojiIcon from "./emojiIcon.js";
import config from "../../core/config.js";
import type { Plan } from "../../../types/entities/plan.js";
import stringHelper from "../../core/helpers/stringHelper.js";
import type { RequestContext } from "../../../types/telegram.js";

export default function (context: RequestContext, plan: Plan) {
    const pointAmount = stringHelper.digitLocalization(stringHelper.thousandSeparator(plan.points), context.user.lang);
    const days = stringHelper.digitLocalization(plan.days, context.user.lang);
    const price = `${stringHelper.digitLocalization(stringHelper.thousandSeparator(plan.price * config.usdToIrtMultiplier), context.user.lang)} ${context.uiText.irt}`
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
