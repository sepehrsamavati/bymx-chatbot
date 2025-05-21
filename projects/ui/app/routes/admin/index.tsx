import Button from "~/components/button";
import { useNavigate } from "react-router";
import { useSession } from "~/core/Session";

export default function AdminPanelIndex() {
    const session = useSession();
    const navigate = useNavigate();
    return (
        <Button onClick={() => navigate("/ui/admin/models")}>{session.uiText.models}</Button>
    );
}