import { Typography } from "@mui/material";
import { useSession } from "~/core/Session";

export function NotFoundPage() {
    const session = useSession();

    return (
        <Typography marginTop={10} align="center">
            {session.uiText.itemNotFound}
        </Typography>
    );
}