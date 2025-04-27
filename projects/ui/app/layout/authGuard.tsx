import { Outlet } from "react-router";
import { useSession } from "~/core/Session";

export default function AuthGuard() {
    const session = useSession();

    if (session.localStorage.data.isLoggedIn)
        return <>
            Meow
            <Outlet />
        </>;

    return <>MEOW</>;
}