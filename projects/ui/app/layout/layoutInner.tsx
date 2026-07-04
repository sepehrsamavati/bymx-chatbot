import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import { useNavigate } from "react-router";
import IconButton from "@mui/material/IconButton";
import ArrowBack from "@mui/icons-material/ArrowBack";

export function LayoutInner(props?: {
    children?: React.ReactNode;
    fullWidth?: boolean;
    fullHeight?: boolean;
    topBar?: boolean | React.ReactNode;
}) {
    const navigate = useNavigate();

    return (
        <Stack alignItems="center" direction="column" height={props?.fullHeight ? "100%" : "initial"}>
            <Stack direction="column" width="100%" height={props?.fullHeight ? "100%" : "initial"} maxWidth={props?.fullWidth ? "100%" : "700px"} gap={1} sx={props?.fullHeight ? { minHeight: 0 } : undefined}>

                {props?.topBar ? (
                    <Box textAlign="center">
                        <Stack direction="row" flexWrap="wrap" gap={1} paddingInline={1}>

                            <IconButton
                                sx={{
                                    marginInlineEnd: "auto"
                                }}
                                onClick={() => navigate("/ui/chats")}
                            >
                                <ArrowBack sx={{ rotate: document.documentElement.dir === "rtl" ? "180deg" : "0deg" }} />
                            </IconButton>

                            {typeof props.topBar === "boolean" ? null : props.topBar}

                        </Stack>
                    </Box>
                ) : null}

                {props?.children}

            </Stack>
        </Stack>
    );
}