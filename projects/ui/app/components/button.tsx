import { useMemo } from "react";
import { CircularProgress } from "@mui/material";
import MuiButton, { type ButtonProps } from "@mui/material/Button";

export default function Button(props: { isLoading?: boolean; rounded?: boolean; } & ButtonProps) {

    // delete custom props
    const buttonProps = useMemo(() => {
        const originProps: Partial<typeof props> = { ...props };
        delete originProps.isLoading;
        delete originProps.rounded;
        return originProps as ButtonProps;
    }, [props]);

    return (
        <MuiButton
            variant="contained"
            {...buttonProps}
            sx={{
                borderRadius: props.rounded ? 50 : undefined,
                ...props.sx,
            }}
            startIcon={props.isLoading ? <CircularProgress size="1em" color="inherit" /> : props?.startIcon}
            disabled={props.isLoading || props.disabled}
        >{props?.children}</MuiButton>
    );
}
