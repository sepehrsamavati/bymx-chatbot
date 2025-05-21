import Button from "~/components/button";
import { useSession } from "~/core/Session";
import Check from "@mui/icons-material/Check";
import type { AiModelEntity } from "bymx-core/types";
import modelService from "~/core/services/modelService";
import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Card, CardActions, CardContent, CardHeader, Chip, Grid, IconButton, Stack, Switch } from "@mui/material";

type MuiColor = 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';

const providerToMuiColor = (p: number): MuiColor => ({
    1: "success",
    2: "error",
    3: "warning",
} as const)[p] ?? "default";

export default function AdminPanelIndex() {
    const session = useSession();
    const initialized = useRef(false);
    const [refreshing, setRefreshing] = useState(false);
    const [models, setModels] = useState<AiModelEntity.AIModel[]>();

    const fetchData = useCallback(() => {
        modelService
            .getAllRaw()
            .then(res => {
                if (res.result?.data) {
                    setModels(res.result.data);
                } else {
                    session.snackbarProvider(res.result?.message, { variant: "error" });
                }
            });
    }, [session]);

    const updateModel = useCallback((id: string, update: Partial<AiModelEntity.AIModel>) => {
        modelService
            .update(id, update)
            .then(res => {
                if (res.result?.ok)
                    fetchData();
                session.snackbarProvider(res.result?.message, { variant: res.result?.ok ? "success" : "error" });
            });
    }, [fetchData, session]);

    const refreshModels = useCallback(() => {
        setRefreshing(true);
        modelService
            .refresh()
            .then(res => {
                fetchData();
                session.snackbarProvider(res.result?.message, { variant: res.result?.ok ? "success" : "error" });
            })
            .finally(() => setRefreshing(false));
    }, [fetchData, session]);

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;
        fetchData();
    }, [fetchData]);

    return (
        <>
            <Box padding={2} marginBottom={5}>
                <Button variant="outlined" color="success" disabled={refreshing} onClick={refreshModels}>{session.uiText.refreshModels}</Button>
            </Box>
            <Grid container spacing={2} margin={2}>
                {models?.map(model => (
                    <Grid key={model.id} size={{ xs: 12, md: 6, lg: 4, xl: 3 }}>
                        <Card>
                            <CardHeader
                                title={model.title}
                                avatar={
                                    <Chip color={providerToMuiColor(model.provider)} label={<>P{model.provider} | T{model.type}</>} />
                                }
                                subheader={<Chip size="small" label={model.name} />}
                                sx={{
                                    fontFamily: "monospace",
                                    direction: session.fixDirection("ltr"),
                                    textAlign: "center"
                                }}
                            />
                            <CardContent>
                                <Stack direction="row" justifyContent="space-evenly" spacing={2}>
                                    <Card variant="outlined">
                                        <CardHeader
                                            title="PPMU"
                                            avatar={<></>}
                                        />
                                        <CardContent>
                                            <Stack direction="row" flexWrap="wrap" gap={1}>
                                                <Chip size="small" variant="outlined" color="success" label={<>In ${model.pricePmu.input.toLocaleString()}</>} />
                                                <Chip size="small" variant="outlined" color="info" label={<>Out ${model.pricePmu.output.toLocaleString()}</>} />
                                            </Stack>
                                        </CardContent>
                                    </Card>
                                    <Card variant="outlined">
                                        <CardHeader
                                            title="LLM"
                                            avatar={<></>}
                                        />
                                        <CardContent>
                                            <Stack direction="row" flexWrap="wrap" alignItems="center" gap={1}>
                                                <Chip size="small" variant="outlined" color="error" label={<>CW {model.llmInfo.contextWindow.toLocaleString()}</>} />
                                                <Chip size="small" variant="outlined" color="default" label={<>MOT {model.llmInfo.maxOutputTokens.toLocaleString()}</>} />
                                                <IconButton color={model.llmInfo.canStream ? "success" : "default"} disabled={!model.llmInfo.canStream} size="small"><Check fontSize="small" /></IconButton>
                                            </Stack>
                                        </CardContent>
                                    </Card>
                                </Stack>
                            </CardContent>
                            <CardActions>
                                <Switch color="success" checked={!model.isDeleted} onClick={() => updateModel(model.id, { isDeleted: !model.isDeleted })} />
                            </CardActions>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </>
    );
}