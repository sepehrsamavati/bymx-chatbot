import Box from "@mui/material/Box";
import Icon from "@mui/material/Icon";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import type { AiModelEntity } from "bymx-core/types";
import type { SelectChangeEvent } from "@mui/material";
import ChatMoreActions from "./chatMoreActions";
import ModelCostIndicatorIcon from "./modelCostIndicatorIcon";

type ChatTopBarProps = {
    modelsReadyKey: number;
    models: AiModelEntity.AIModelViewModel[];
    showModelSelect: boolean;
    selectedModel: string;
    modelChangeLock: boolean;
    chatId?: string;
    onModelChange: (event: SelectChangeEvent<string>) => void;
    onClearMessages: () => void;
};

export default function ChatTopBar(props: ChatTopBarProps) {
    return (
        <>
            <div key={props.modelsReadyKey}>
                {props.showModelSelect ? (
                    <Select
                        disabled={props.modelChangeLock}
                        size="small"
                        sx={{
                            borderRadius: 50,
                            fontFamily: "monospace",
                            fontSize: "0.8em",
                            "> .MuiSelect-select": { padding: 1 },
                        }}
                        value={props.selectedModel}
                        onChange={props.onModelChange}
                        displayEmpty
                    >
                        {props.models.map(model => (
                            <MenuItem
                                key={model.id}
                                value={model.id}
                                sx={{ fontFamily: "monospace", direction: "ltr", fontSize: "0.8em", padding: 1, minHeight: "unset" }}
                            >
                                <Stack direction="row" alignItems="center">
                                    <Icon fontSize="small">
                                        <ModelCostIndicatorIcon model={model} />
                                    </Icon>
                                    {model.title}
                                </Stack>
                            </MenuItem>
                        ))}
                    </Select>
                ) : null}
            </div>

            <Box>
                {props.chatId ? (
                    <ChatMoreActions chatId={props.chatId} onClearMessage={props.onClearMessages} />
                ) : null}
            </Box>
        </>
    );
}
