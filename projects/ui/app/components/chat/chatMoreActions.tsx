import Menu from "@mui/material/Menu";
import { useNavigate } from "react-router";
import { useSession } from "~/core/Session";
import { useCallback, useState } from "react";
import MenuItem from "@mui/material/MenuItem";
import IconButton from "@mui/material/IconButton";
import Warning from "@mui/icons-material/Warning";
import ClearAll from "@mui/icons-material/ClearAll";
import MoreVert from "@mui/icons-material/MoreVert";
import chatService from "~/core/services/chatService";
import ListItemIcon from "@mui/material/ListItemIcon";
import DeleteForever from "@mui/icons-material/DeleteForever";

export default function ChatMoreActions(props: {
    chatId: string;
    onClearMessage: () => void;
}) {
    const session = useSession();
    const navigate = useNavigate();
    const [deletingChat, setDeletingChat] = useState(false);
    const [clearingHistory, setClearingHistory] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };
    const handleClose = () => {
        setAnchorEl(null);
        setShowDeleteConfirm(false);
    };

    const clearHistory = useCallback(() => {
        handleClose();
        setClearingHistory(true);
        chatService
            .clearMessages(props?.chatId as string)
            .then(res => {
                if (res.result?.ok)
                    props?.onClearMessage?.();
                else
                    session.snackbarProvider(res.result?.message, { variant: "error" });
            })
            .finally(() => setClearingHistory(false));
    }, [props]);

    const deleteChat = useCallback(() => {
        setDeletingChat(true);
        chatService
            .delete(props?.chatId as string)
            .then(res => {
                if (res.result?.ok)
                    navigate("/ui/chats");
                else
                    session.snackbarProvider(res.result?.message, { variant: "error" });
            })
            .finally(() => setDeletingChat(false));
    }, [props, navigate]);

    if (!props?.chatId)
        return null;

    return (
        <div>
            <IconButton
                aria-label="more"
                id="chat-actions-button"
                aria-controls={open ? 'chat-actions-menu' : undefined}
                aria-expanded={open ? 'true' : undefined}
                aria-haspopup="true"
                onClick={handleClick}
            >
                <MoreVert />
            </IconButton>
            <Menu
                id="chat-actions-menu"
                //   MenuListProps={{
                //     'aria-labelledby': 'chat-actions-button',
                //   }}
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
            //   slotProps={{
            //     paper: {
            //       style: {
            //         maxHeight: ITEM_HEIGHT * 4.5,
            //         width: '20ch',
            //       },
            //     },
            //   }}
            >
                <MenuItem disabled={clearingHistory} onClick={clearHistory}>
                    <ListItemIcon>
                        <ClearAll fontSize="small" />
                    </ListItemIcon>
                    {session.uiText.clearCurrentChatHistory}
                </MenuItem>
                {showDeleteConfirm ? (
                    <MenuItem disabled={deletingChat} onClick={deleteChat}>
                        <ListItemIcon color="red">
                            <Warning color="error" fontSize="small" />
                        </ListItemIcon>
                        {session.uiText.confirmToDelete}
                    </MenuItem>
                ) : (
                    <MenuItem onClick={() => setShowDeleteConfirm(true)}>
                        <ListItemIcon color="red">
                            <DeleteForever fontSize="small" />
                        </ListItemIcon>
                        {session.uiText.delete}
                    </MenuItem>
                )}
            </Menu>
        </div>
    );
}