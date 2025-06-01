import { useSession } from "~/core/Session";
import { useCallback, useState } from "react";
import { LayoutInner } from "~/layout/layoutInner";
import { getLanguageList } from "~/core/i18n/i18n";
import userService from "~/core/services/userService";
import { AIChatHistoryMemory, type UIText } from "bymx-core/shared";
import { Box, Chip, FormControl, FormControlLabel, Grid, InputLabel, MenuItem, Select, Stack, Switch, type SelectChangeEvent } from "@mui/material";

export default function Settings() {
    const session = useSession();
    const [languageChangeLock, setLanguageChangeLock] = useState(false);
    const [memoryAmountChangeLock, setMemoryAmountChangeLock] = useState(false);
    const [showExperimentalFeaturesSwitch, setShowExperimentalFeaturesSwitch] = useState(false);
    const [experimentalFeatures, setExperimentalFeatures] = useState(session.localStorage.data.experimentalFeatures);

    const handleMemoryAmountChange = useCallback((event: SelectChangeEvent<AIChatHistoryMemory>) => {
        if (memoryAmountChangeLock) return;
        const memoryAmount = event.target.value as AIChatHistoryMemory;
        setMemoryAmountChangeLock(true);
        userService
            .setMemoryAmount({ amount: memoryAmount })
            .then(res => {
                if (res.result?.ok && session.user) {
                    session.user.memoryAmount = memoryAmount;
                    session.user.saveMessages = memoryAmount !== AIChatHistoryMemory.None;
                }
                else
                    session.snackbarProvider(res.result?.message, { variant: "error" });
            })
            .finally(() => {
                setMemoryAmountChangeLock(false);
            });
    }, [memoryAmountChangeLock, session]);

    const handleLanguageChange = useCallback((event: SelectChangeEvent<string>) => {
        const langCode = event.target.value as UIText.LangCode;
        setLanguageChangeLock(true);
        userService
            .changeLanguage(langCode)
            .then(res => {
                if (res.result?.ok)
                    session.languageChange(langCode);
                else
                    session.snackbarProvider(res.result?.message, { variant: "error" });
            })
            .finally(() => {
                setLanguageChangeLock(false);
            });
    }, [session]);

    return (
        <LayoutInner topBar>
            <Box padding={2}>
                <Stack gap={2}>

                    <Grid container spacing={1} justifyContent="center">
                        <Grid size={{ xs: 12, sm: 6, md: 5, lg: 4, xl: 3 }}>
                            <FormControl
                                fullWidth
                                size="small"
                                component="div"
                            >
                                <InputLabel size="small">{session.uiText.memory}</InputLabel>
                                <Select
                                    disabled={memoryAmountChangeLock}
                                    size="small"
                                    sx={{
                                        borderRadius: 50,
                                    }}
                                    onChange={handleMemoryAmountChange}
                                    value={session.user?.saveMessages ? session.user?.memoryAmount : AIChatHistoryMemory.None}
                                    label={session.uiText.memory}
                                >
                                    <MenuItem value={AIChatHistoryMemory.None}>{session.uiText.disabled}</MenuItem>
                                    <MenuItem value={AIChatHistoryMemory.Short}>{session.uiText.short}</MenuItem>
                                    <MenuItem value={AIChatHistoryMemory.Normal}>{session.uiText.normal}</MenuItem>
                                    <MenuItem value={AIChatHistoryMemory.Long}>{session.uiText.high}</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 5, lg: 4, xl: 3 }}>
                            <FormControl
                                fullWidth
                                size="small"
                                component="div"
                            >
                                <InputLabel size="small">🌐 {session.uiText.language}</InputLabel>
                                <Select
                                    disabled={languageChangeLock}
                                    size="small"
                                    sx={{
                                        borderRadius: 50,
                                    }}
                                    onChange={handleLanguageChange}
                                    value={session.localStorage.data.language}
                                    label={`🌐 ${session.uiText.language}`}
                                >
                                    {getLanguageList().map(item => <MenuItem selected={session.localStorage.data.language === item.langCode} key={item.langCode} value={item.langCode}>{item.title}</MenuItem>)}
                                </Select>
                            </FormControl></Grid>
                    </Grid>

                    <Box marginBlock={2} textAlign="center">
                        <Box onClick={() => setShowExperimentalFeaturesSwitch(true)}>
                            <Chip size="small" color="primary" label={`v${__APP_VERSION__}`} />
                        </Box>
                        {showExperimentalFeaturesSwitch ? (
                            <Box marginTop={2}>
                                <FormControlLabel
                                    label={session.uiText.experimentalFeatures}
                                    control={(
                                        <Switch
                                            checked={experimentalFeatures}
                                            onClick={() => {
                                                session.localStorage.data.experimentalFeatures = !session.localStorage.data.experimentalFeatures;
                                                session.localStorage.rewrite();
                                                setExperimentalFeatures(session.localStorage.data.experimentalFeatures);
                                            }}
                                        />
                                    )}
                                />
                            </Box>
                        ) : null}
                    </Box>
                </Stack>
            </Box>
        </LayoutInner>
    );
}