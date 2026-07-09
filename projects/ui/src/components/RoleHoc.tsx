import { UserType } from "bymx-core/shared";

export default function RoleHoc(props?: {
    user?: UserType;
    allow?: UserType | UserType[];
    children?: React.ReactNode;
}) {
    if (!props?.user)
        return null;

    const allowedUserTypes = Array.isArray(props.allow) ? props.allow : (props.allow ? [props.allow] : []);
    const hasAccess = props.user === UserType.Owner || allowedUserTypes.includes(props.user);

    if (!hasAccess)
        return null;

    return props.children;
}