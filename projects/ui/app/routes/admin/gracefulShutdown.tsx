import { Chip, Stack } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import Button from "~/components/button";
import gracefulShutdownService from "~/core/services/gracefulShutdownService";
import { useSession } from "~/core/Session";
import { LayoutInner } from "~/layout/layoutInner";

export default function GracefulShutdown() {
    const session = useSession();
    const [gettingInfo, setGettingInfo] = useState(false);
    const [isSettingShouldShutdown, setIsSettingShouldShutdown] = useState(false);
    const [info, setInfo] = useState<{ activeRequests: number; lastRequestStart: number; }>();

    const shouldShutdown = useCallback(() => {
        setIsSettingShouldShutdown(true);
        gracefulShutdownService
            .shouldShutdown()
            .then(res => {
                session.snackbarProvider(res.result?.message, { variant: res.result?.ok ? "success" : "error" });
            })
            .finally(() => setIsSettingShouldShutdown(false));
    }, [session]);

    const getInfo = useCallback(() => {
        setGettingInfo(true);
        gracefulShutdownService
            .getRequestsInfo()
            .then(res => {
                if (res.result?.data)
                    setInfo(res.result.data);
                else
                    session.snackbarProvider(res.result?.message, { variant: "error" });
            })
            .finally(() => setGettingInfo(false));
    }, [session]);

    useEffect(() => {
        getInfo();
    }, [getInfo]);

    return (
        <LayoutInner topBar>
            <Stack direction="row" flexWrap="wrap" gap={2} justifyContent="center">
                <Button
                    color="warning"
                    onClick={shouldShutdown}
                    disabled={isSettingShouldShutdown}
                >Shutdown</Button>
                <Button
                    variant="outlined"
                    color="success"
                    onClick={getInfo}
                    disabled={gettingInfo}
                >Get</Button>
            </Stack>
            <Stack marginTop={2} direction="row" flexWrap="wrap" gap={2} justifyContent="center" sx={{ direction: session.fixDirection("ltr") }}>
                <Chip size="small" label={`Active: ${info?.activeRequests ?? '-'}`} />
                <Chip size="small" label={`Last: ${info?.lastRequestStart ? new Date(info.lastRequestStart).toLocaleString() : '-'}`} />
            </Stack>
        </LayoutInner>
    );
}