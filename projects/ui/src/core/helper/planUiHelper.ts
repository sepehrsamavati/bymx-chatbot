import type { PlanEntity } from "bymx-core/types";
import crownImage from "~/assets/images/crown.webp";
import rocketImage from "~/assets/images/rocket.webp";
import giftBoxImage from "~/assets/images/gift-box.webp";
import businessImage from "~/assets/images/business.webp";
import hourglassImage from "~/assets/images/hourglass.webp";

enum PlanIds {
    DailyFree = "6874c6043d576117b27c9180",
    ShortTerm = "67572309473fea2171efa653",
    Plus = "67572320473fea2171efa654",
    Pro = "67572332473fea2171efa655",
    Gold = "6757233d473fea2171efa656",
}

export const planToGradientColors = (plan: Partial<PlanEntity.PlanViewModel>) => {

    if (plan.id)
        return idToGradientColors(plan.id);

    const irtPrice = plan.irtPrice;
    if (typeof irtPrice === "number") {

        if (irtPrice === 0)
            return ['#ffffff'];

        if (irtPrice <= 10e3)
            return ['#dad7cd', '#a3b18a'];

        if (irtPrice <= 50e3)
            return ['#ccff33', '#38b000'];

        if (irtPrice <= 80e3)
            return ['#4DB5FF', '#4CD97B'];

        if (irtPrice < 200e3)
            return ['#c8b6ff', '#0496ff'];

        if (irtPrice < 500e3)
            // return ['#6A78D1', '#FFCF67'];
            return ['#7678ed', '#390099'];

        return ['#dad7cd', '#a3b18a'];
    }

    return ['#ffffff'];
};

export const idToGradientColors = (id: string) => {
    if (id === PlanIds.DailyFree)
        return ['#ffffff'];

    if (id === PlanIds.ShortTerm)
        return ['#ccff33', '#38b000'];

    if (id === PlanIds.Plus)
        return ['#c8b6ff', '#0496ff'];

    if (id === PlanIds.Pro)
        // return ['#6A78D1', '#FFCF67'];
        return ['#7678ed', '#390099'];

    if (id === PlanIds.Gold)
        return ['#faedcd', '#fca311'];

    return ['#dad7cd', '#a3b18a'];
};

export const planIconExtractor = (plan: PlanEntity.PlanViewModel) => {

    if (plan.irtPrice === 0)
        return giftBoxImage;

    if (plan.id === PlanIds.ShortTerm || plan.days < 7)
        return hourglassImage;

    if (plan.id === PlanIds.Plus || plan.irtPrice < 200e3)
        return rocketImage;

    if (plan.id === PlanIds.Pro || plan.irtPrice < 600e3)
        return businessImage;

    if (plan.id === PlanIds.Gold || plan.irtPrice > 900e3)
        return crownImage;

    return rocketImage;
};

export const hexToRgba = (hex: string, alpha: number) => {
    // Remove # if present
    hex = hex.replace('#', '');

    // Parse r, g, b values
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    return `rgb(${r}, ${g}, ${b}, ${alpha})`;
};
