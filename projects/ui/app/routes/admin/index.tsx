import Stack from "@mui/material/Stack";
import Button from "~/components/button";
import { useNavigate } from "react-router";
import { useSession } from "~/core/Session";
import { LayoutInner } from "~/layout/layoutInner";

export default function AdminPanelIndex() {
    const session = useSession();
    const navigate = useNavigate();
    return (
        <LayoutInner topBar>
            <Stack direction="row" flexWrap="wrap" gap={2} justifyContent="center">
                <Button onClick={() => navigate("/ui/admin/models")}>{session.uiText.models}</Button>
                <Button onClick={() => navigate("/ui/admin/shutdown")}>Shutdown</Button>
            </Stack>
        </LayoutInner>
    );
}