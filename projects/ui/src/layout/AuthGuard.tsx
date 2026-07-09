import { useEffect, useRef } from "react";
import { useSession } from "~/core/Session";
import { Outlet, useNavigate } from "react-router";
import userService from "~/core/services/userService";

export function AuthGuard() {
    const session = useSession();
    const navigate = useNavigate();
    const fetchUserInfoLock = useRef(false);

    useEffect(() => {
        if (session.localStorage.data.isLoggedIn) {
            if (session.user || fetchUserInfoLock.current) return;
            fetchUserInfoLock.current = true;
            userService.getMe()
                .then(res => {
                    if (res.result?.data) {
                        session.user = res.result.data;
                    } else {
                        session.signOut();
                        navigate("/ui/login");
                    }
                })
                .then(() => fetchUserInfoLock.current = false);
        }
        else
            navigate("/ui/login");
    }, [navigate, session]);

    if (session.localStorage.data.isLoggedIn)
        return <Outlet />;

    return null;
}