import { UserType } from "../types/enums/userTypes.js";

export const accessHelper = (targetType: UserType, userType: UserType) => {
    const isOwner = userType === UserType.Owner;
    if (isOwner)
        return true;

    if (targetType === UserType.Owner)
        return false;

    const isAdmin = userType === UserType.Admin;
    if (isAdmin)
        return true;

    if (targetType === UserType.Admin)
        return false;

    const isManager = userType === UserType.Manager;
    if (isManager)
        return true;

    if (targetType === UserType.Manager)
        return false;

    return targetType === UserType.Normal;
};