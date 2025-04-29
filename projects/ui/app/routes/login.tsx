import Button from "~/components/button";
import colors from "~/core/config/colors";
import { UIText } from "bymx-core/shared";
import { useNavigate } from "react-router";
import { useSession } from "~/core/Session";
import { useCallback, useEffect, useMemo, useState } from "react";
import userService from "~/core/services/userService";
import CenteredContent from "~/layout/centeredContent";
import ChevronLeft from "@mui/icons-material/ChevronLeft";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { Alert, Box, CssBaseline, FormControl, Grid, InputLabel, MenuItem, Select, Stack, TextField, Typography } from "@mui/material";

enum FormState {
    EnterPhoneNumber,
    EnterOTP,
}

export default function Login() {
    const session = useSession();
    const navigate = useNavigate();
    const [formState, setFormState] = useState(FormState.EnterPhoneNumber);
    const [countryCode, setCountryCode] = useState("+98");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [otp, setOtp] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const fullPhoneNumber = useMemo(() => parsePhoneNumberFromString(countryCode + phoneNumber), [countryCode, phoneNumber]);

    const requestTelegramOtp = useCallback(() => {
        if (!fullPhoneNumber?.isValid()) return;
        setIsLoading(true);
        userService
            .requestTelegramOtp(fullPhoneNumber.number)
            .then(res => {
                if (res.result?.ok)
                    setFormState(FormState.EnterOTP);
                else
                    session.snackbarProvider(res.result?.message, { variant: "error" });
            })
            .finally(() => setIsLoading(false));
    }, [fullPhoneNumber]);

    const telegramOtpAuth = useCallback(() => {
        if (!(fullPhoneNumber?.isValid() && otp)) return;
        setIsLoading(true);
        userService
            .telegramOtpAuth(fullPhoneNumber.number, otp)
            .then(res => {
                if (res.result?.data) {
                    session.user = res.result.data;
                    session.postLoginEvents();
                    navigate("/ui/");
                }
                else {
                    session.snackbarProvider(res.result?.message, { variant: "error" });
                    setIsLoading(false);
                }
            });
    }, [fullPhoneNumber, otp]);

    useEffect(() => {
        if (session.localStorage.data.isLoggedIn)
            navigate("/ui/");
    }, [session, navigate]);

    return (
        <CenteredContent>
            <Box
                width="100%"
                maxWidth="400px"
                sx={{
                    padding: 2,
                    borderRadius: 2,
                    border: 2,
                    borderColor: colors.brand
                }}
            >
                <Stack direction="row" flexWrap="wrap" alignItems="center" justifyContent="space-between">
                    <Typography
                        component="h2"
                        fontSize="1.6em"
                        sx={{
                            borderInlineStart: 3,
                            borderInlineStartStyle: 'dotted',
                            borderInlineStartColor: colors.brandSecondary,
                            padding: "0.3em"
                        }}
                    >{session.uiText.loginToAccount}</Typography>
                    <FormControl
                        size="small"
                        component="div"
                        fullWidth={false}
                    >
                        <InputLabel size="small">{session.uiText.language}</InputLabel>
                        <Select
                            size="small"
                            sx={{
                                borderRadius: 50,
                            }}
                            onChange={e => session.languageChange(e.target.value, false)}
                            value={session.localStorage.data.language}
                            label={session.uiText.language}
                        >
                            {UIText.langCodes.map(langCode => <MenuItem selected={session.localStorage.data.language === langCode} key={langCode} value={langCode}>{langCode}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Stack>
                <CssBaseline />
                <Box>
                    <Grid container width="100%" gap={3} marginBlock={4} justifyContent="end">
                        {formState === FormState.EnterPhoneNumber ? (
                            <>
                                <Grid size={{ xs: 12 }}>
                                    <Stack direction="row">
                                        <Box width="80px">
                                            <TextField
                                                type="text"
                                                label={session.uiText.countryCode}
                                                value={countryCode}
                                                slotProps={{
                                                    htmlInput: {
                                                        sx: {
                                                            fontFamily: "monospace",
                                                        }
                                                    }
                                                }}
                                                onChange={e => {
                                                    const code = Number.parseInt(e.target.value.replace('+', '').replace(/\s/g, ''));
                                                    setCountryCode(`+${Number.isNaN(code) || code > 999 ? "" : code}`);
                                                }}
                                            />
                                        </Box>
                                        <Box flexGrow={1}>
                                            <TextField
                                                type="text"
                                                fullWidth
                                                label={session.uiText.phoneNumber}
                                                value={phoneNumber}
                                                slotProps={{
                                                    htmlInput: {
                                                        sx: {
                                                            fontFamily: "monospace",
                                                        }
                                                    }
                                                }}
                                                onChange={e => {
                                                    const value = e.target.value.replace(/\s/g, '');
                                                    setPhoneNumber(value);
                                                }}
                                            />
                                        </Box>
                                    </Stack>
                                </Grid>
                                <Grid>
                                    <Button
                                        size="small"
                                        type="button"
                                        color="success"
                                        startIcon={<ChevronLeft />}
                                        isLoading={isLoading}
                                        disabled={fullPhoneNumber?.isValid() !== true}
                                        onClick={requestTelegramOtp}
                                    >{session.uiText.requestOtp}</Button>
                                </Grid>
                            </>
                        ) : null}
                        {formState === FormState.EnterOTP ? (
                            <>
                                <Grid size={{ xs: 12 }}>
                                    <Alert color="success">{session.uiText.otpSentToTelegram}</Alert>
                                </Grid>
                                <Grid size={{ xs: 12 }}>
                                    <TextField
                                        type="text"
                                        fullWidth
                                        label={session.uiText.otp}
                                        value={otp}
                                        slotProps={{
                                            htmlInput: {
                                                sx: {
                                                    fontFamily: "monospace",
                                                    textAlign: "center",
                                                }
                                            }
                                        }}
                                        onChange={e => {
                                            const value = e.target.value.toUpperCase();
                                            setOtp(value);
                                        }}
                                    />
                                </Grid>
                                <Grid>
                                    <Button
                                        size="small"
                                        type="button"
                                        color="success"
                                        startIcon={<ChevronLeft />}
                                        isLoading={isLoading}
                                        onClick={telegramOtpAuth}
                                    >{session.uiText.login}</Button>
                                </Grid>
                            </>
                        ) : null}
                    </Grid>
                </Box>
            </Box>
        </CenteredContent>
    );
}