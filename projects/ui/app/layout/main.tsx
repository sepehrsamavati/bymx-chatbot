import React, { useCallback, useState, useEffect, useRef } from "react";
import Stack from "@mui/material/Stack";
import RoleHoc from "~/components/roleHoc";
import Menu from "@mui/icons-material/Menu";
import { useSession } from "~/core/Session";
import Container from '@mui/material/Container';
import bymxLogo from "../assets/images/bymx.jpg";
import IconButton from "@mui/material/IconButton";
import type { UserEntity } from "bymx-core/types";
import { getLanguageList } from "~/core/i18n/i18n";
import CssBaseline from '@mui/material/CssBaseline';
import DarkMode from "@mui/icons-material/DarkMode";
import LightMode from "@mui/icons-material/LightMode";
import userService from "~/core/services/userService";
import CreditCard from "@mui/icons-material/CreditCard";
import { Link, Outlet, useNavigate } from "react-router";
import OfflineBolt from "@mui/icons-material/OfflineBolt";
import bymxHeader from "../assets/images/baymax_header.png";
import { AIChatHistoryMemory, stringHelper, UIText, UserType } from "bymx-core/shared";
import { Box, Button, Chip, Divider, Drawer, FormControl, FormControlLabel, InputLabel, MenuItem, Select, Skeleton, Switch, Typography, type SelectChangeEvent } from "@mui/material";

function DrawerItem(props?: {
    title?: React.ReactNode;
    children?: React.ReactNode;
}) {
    return (
        <Stack marginBlock={1} direction="row" flexWrap="wrap" justifyContent="space-between" alignItems="center">
            <Typography>{props?.title}</Typography>
            <Box flexGrow={props?.title === null ? 1 : undefined}>{props?.children}</Box>
        </Stack>
    );
}

function ProfileInfo() {
    const session = useSession();
    const navigate = useNavigate();
    const [data, setData] = useState<UserEntity.UserInfoViewModel | undefined>(session.cacheStorage.profileInfo?.data);
    const [memoryAmountChangeLock, setMemoryAmountChangeLock] = useState(false);
    const fetchDataLock = useRef(false);

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

    useEffect(() => {
        if (fetchDataLock.current) return;

        if (session.cacheStorage.profileInfo && Date.now() - session.cacheStorage.profileInfo.date < 30e3) {
            setData(session.cacheStorage.profileInfo.data);
            return;
        }

        fetchDataLock.current = true;
        userService.getProfile()
            .then(res => {
                if (res.result?.data) {
                    setData(res.result.data);
                    session.cacheStorage.profileInfo = {
                        data: res.result.data,
                        date: Date.now(),
                    };
                }
                else
                    session.snackbarProvider(session.uiText.errorWhileFetchingData, { variant: "error" });
            })
            .finally(() => fetchDataLock.current = false);
    }, []);

    const fullname = data ? `${data.user.firstName || ""} ${data.user.lastName || ""}` : "";

    return (
        <Box padding={2}>

            <RoleHoc user={session.user?.type} allow={UserType.Admin}>
                <DrawerItem title={null}>
                    <Button fullWidth color="success" onClick={() => navigate("/ui/admin")}>{session.uiText.adminPanel}</Button>
                </DrawerItem>
            </RoleHoc>

            <DrawerItem title={<span dir={stringHelper.isRtl(fullname) ? "rtl" : "ltr"}>{fullname || <Skeleton width={80} />}</span>} />
            <Divider variant="middle" flexItem />
            {/* {data.dailyFreePoints ? ( */}
            <DrawerItem
                title={
                    <Button size="small" type="button" variant="text" color="inherit" startIcon={<OfflineBolt sx={{ mb: '2px' }} />}>
                        {session.uiText.dailyFreePoints}
                    </Button>
                }
            >
                {data?.dailyFreePoints ? (
                    <Box textAlign="end">
                        <Chip
                            size="small"
                            color={data.dailyFreePoints.remaining <= 10 ? "warning" : "success"}
                            label={stringHelper.digitLocalization(`${data.dailyFreePoints.remaining}/${data.dailyFreePoints.total}`, session.uiText._langCode)}
                        />
                        {!data.dailyFreePoints.isSupported ? (
                            <Typography fontSize="0.6em" fontStyle="italic">({stringHelper.formatter(session.uiText.onlyAvailableToXUsers, session.uiText.iranian)})</Typography>
                        ) : null}
                    </Box>
                ) : <Skeleton width={80} />}
            </DrawerItem>
            {/* ) : null} */}
            <DrawerItem
                title={
                    <Button size="small" type="button" variant="text" color="inherit" startIcon={<CreditCard sx={{ mb: '2px' }} />}>
                        {session.uiText.activePackages}
                    </Button>
                }
            >
                {data ? (
                    typeof data.activePurchasedPlans === "number" && data.activePurchasedPlans > 0 ? (
                        <>
                            <span>{stringHelper.digitLocalization(data.activePurchasedPlans, session.uiText._langCode)} </span>
                            (<Button type="button" variant="text" color="primary" startIcon={<OfflineBolt sx={{ mb: '2px' }} />}>
                                {stringHelper.digitLocalization(stringHelper.thousandSeparator(data.paidSubscriptionsRemainingPoints ?? 0), session.uiText._langCode)}
                            </Button>)
                        </>
                    ) : (
                        <Chip
                            size="small"
                            color="default"
                            variant="filled"
                            label={session.uiText.noActiveSubscription}
                        />
                    )
                ) : <Skeleton width={80} />}
            </DrawerItem>
            <Divider variant="middle" flexItem />

            <DrawerItem title={null}>
                <FormControl
                    fullWidth
                    margin="dense"
                    component="div"
                    size="small"
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
            </DrawerItem>

            <Divider variant="middle" flexItem />
        </Box>
    );
}

function Header() {
    const session = useSession();
    const [menuIsOpen, setMenuIsOpen] = useState(false);
    const [showExperimentalFeaturesSwitch, setShowExperimentalFeaturesSwitch] = useState(false);
    const [languageChangeLock, setLanguageChangeLock] = useState(false);
    const [changeThemeIcon, setChangeThemeIcon] = useState(session.themeManager.name === 'light' ? <LightMode key="light" /> : <DarkMode key="dark" />);
    const openMenuRequestHandler = () => setMenuIsOpen(true);
    const closeMenuRequestHandler = () => setMenuIsOpen(false);
    const [experimentalFeatures, setExperimentalFeatures] = useState(session.localStorage.data.experimentalFeatures);

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

    const toggleTheme = useCallback(() => {
        const newThemeName = session.themeManager.name === 'light' ? 'dark' : 'light';
        session.themeManager.set(newThemeName);
        setChangeThemeIcon(newThemeName === 'light' ? <LightMode key="light" /> : <DarkMode key="dark" />);
    }, [session]);

    useEffect(() => {
        session.requestSideMenuOpen = () => setMenuIsOpen(true);
    }, [session]);

    return (
        <header>
            <Stack direction="row" justifyContent="space-between">
                <Box padding={0.4}>
                    <IconButton onClick={openMenuRequestHandler}>
                        <Menu />
                    </IconButton>
                </Box>

                <Link to="/ui">
                    <Box
                        component="img"
                        src={bymxHeader}
                        sx={{
                            height: 50,
                            padding: 0.2,
                            // maxWidth: "100%",
                        }}
                    />
                </Link>

                <Link to="/ui">
                    <Box
                        component="img"
                        src={bymxLogo}
                        sx={{
                            height: 50,
                            padding: 0.5,
                            borderRadius: "50%",
                        }}
                    />
                </Link>
            </Stack>

            <Drawer
                anchor="left"
                open={menuIsOpen}
                variant="temporary"
                onClose={closeMenuRequestHandler}
            >
                <Box
                    width="75vw"
                    height="100%"
                    maxWidth="360px"
                >
                    <ProfileInfo />
                    <Box padding={2}>
                        <DrawerItem title={session.uiText.language}>
                            <FormControl
                                component="div"
                                size="small"
                            >
                                <InputLabel size="small">{session.uiText.language}</InputLabel>
                                <Select
                                    disabled={languageChangeLock}
                                    size="small"
                                    sx={{
                                        borderRadius: 50,
                                        minWidth: "90px",
                                    }}
                                    onChange={handleLanguageChange}
                                    value={session.localStorage.data.language}
                                    label={session.uiText.language}
                                >
                                    {getLanguageList().map(item => <MenuItem selected={session.localStorage.data.language === item.langCode} key={item.langCode} value={item.langCode}>{item.title}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </DrawerItem>
                        <Box marginBlock={3} textAlign="center">
                            <IconButton
                                color="inherit"
                                onClick={toggleTheme}
                            >{changeThemeIcon}</IconButton>
                        </Box>
                        <Box marginBlock={3} textAlign="center">
                            <Button
                                fullWidth
                                color="error"
                                variant="text"
                                onClick={() => session.signOut()}
                            >{session.uiText.logout}</Button>
                        </Box>
                        <Box marginBlock={15} textAlign="center">
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
                    </Box>
                </Box>
            </Drawer>
        </header>
    );
}

export default function MainLayout() {
    return (
        <>
            <CssBaseline />
            <Container
                sx={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    display: 'flex',
                    flexDirection: 'column',
                    '& > main': {
                        flexGrow: 1,
                        overflowY: "auto",
                        paddingTop: 1,
                        marginTop: -1,
                    }
                }}
                maxWidth={false}
                disableGutters
            >
                <Header />
                <main>
                    <Outlet />
                </main>
                {/* <Footer /> */}
            </Container>
        </>
    );
}