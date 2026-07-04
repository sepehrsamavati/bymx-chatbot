import Button from "~/components/button";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import MenuBook from "@mui/icons-material/MenuBook";
import DataObject from "@mui/icons-material/DataObject";
import Restaurant from "@mui/icons-material/Restaurant";
import FitnessCenter from "@mui/icons-material/FitnessCenter";
import AccountCircle from "@mui/icons-material/AccountCircle";
import type Session from "~/core/Session";
import { ReadyPromptCategory } from "./types";

type ChatEmptyStateProps = {
    session: Session;
    onSelectCategory: (category: ReadyPromptCategory) => void;
};

export default function ChatEmptyState({ session, onSelectCategory }: ChatEmptyStateProps) {
    return (
        <Box width="100%" flexGrow={1} display="flex" alignItems="center" justifyContent="center">
            <Stack gap={2}>
                <Box textAlign="center">
                    <Button
                        fullWidth={false}
                        size="large"
                        variant="outlined"
                        color="inherit"
                        sx={{ borderRadius: "10em" }}
                        startIcon={<AccountCircle />}
                        onClick={() => session.requestSideMenuOpen?.()}
                    >
                        {session.uiText.profile}/{session.uiText.chats}
                    </Button>
                </Box>

                <Divider />

                <Typography textAlign="center">{session.uiText.recommendedTopics} 👇</Typography>

                <Stack direction="row" flexWrap="wrap" gap={1} maxWidth="250px" justifyContent="center">
                    <Chip variant="outlined" color="info" label={session.uiText.coding} icon={<DataObject />} onClick={() => onSelectCategory(ReadyPromptCategory.Coding)} />
                    <Chip variant="outlined" color="success" label={session.uiText.workout} icon={<FitnessCenter />} onClick={() => onSelectCategory(ReadyPromptCategory.Workout)} />
                    <Chip variant="outlined" color="error" label={session.uiText.cooking} icon={<Restaurant />} onClick={() => onSelectCategory(ReadyPromptCategory.Cooking)} />
                    <Chip variant="outlined" color="warning" label={session.uiText.summarizeText} icon={<MenuBook />} onClick={() => onSelectCategory(ReadyPromptCategory.SummarizeText)} />
                </Stack>
            </Stack>
        </Box>
    );
}
