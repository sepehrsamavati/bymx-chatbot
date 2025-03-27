import Box from "@mui/material/Box";
import colors from "~/core/config/colors";
import { useSession } from "~/core/Session";
import Typography from "@mui/material/Typography";
import CssBaseline from "@mui/material/CssBaseline";
import CenteredContent from "~/layout/centeredContent";
import { useLayoutEffect, useRef, useState } from "react";
import LinearProgress from "@mui/material/LinearProgress";

export function AuthenticateUser() {
    const initialized = useRef(false);
    const session = useSession();
    const [waitingForTelegram, setWaitingForTelegram] = useState(true);

    useLayoutEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        // wait till 'Telegram' object is ready
        const timer = window.setInterval(() => {
            if (window.Telegram?.WebApp?.initData) {
                window.clearInterval(timer);
                setWaitingForTelegram(false);
                session.getUserInfo();
            }
        }, 500);
    }, [session]);

    return (
        <CenteredContent>
            <CssBaseline />
            <Box>
                <Typography
                    component="h2"
                    fontSize="1.6em"
                    sx={{
                        backgroundColor: colors.brand,
                        color: colors.antiFlashWhite,
                        padding: "0.8em",
                        borderRadius: 2
                    }}
                >{waitingForTelegram ? session.uiText.connectingToTelegram : session.uiText.authenticating} <LinearProgress /></Typography>
                <Typography component="div" dir="ltr" fontSize="0.9em">
                    {/* <span><AppName /> <sub style={{ display: "inline-block" }}><AppVersion /></sub></span> */}
                </Typography>
            </Box>
            {/* <OldBrowserWarning /> */}
        </CenteredContent>
    );
}