import { useCallback, useState } from "react";
import Stack from "@mui/material/Stack";
import { Link, Outlet } from "react-router";
import { Box, Drawer, FormControl, InputLabel, MenuItem, Select, Typography, type SelectChangeEvent } from "@mui/material";
import Menu from "@mui/icons-material/Menu";
import { useSession } from "~/core/Session";
import Container from '@mui/material/Container';
import bymxLogo from "../assets/images/bymx.jpg";
import IconButton from "@mui/material/IconButton";
import CssBaseline from '@mui/material/CssBaseline';
import DarkMode from "@mui/icons-material/DarkMode";
import LightMode from "@mui/icons-material/LightMode";
import bymxHeader from "../assets/images/baymax_header.png";
import userService from "~/core/services/userService";
import { UIText } from "bymx-core/shared";

function Header() {
    const session = useSession();
    const [menuIsOpen, setMenuIsOpen] = useState(false);
    const [languageChangeLock, setLanguageChangeLock] = useState(false);
    const openMenuRequestHandler = () => setMenuIsOpen(true);
    const closeMenuRequestHandler = () => setMenuIsOpen(false);

    const handleLanguageChange = useCallback((event: SelectChangeEvent<string>) => {
        const langCode = event.target.value as UIText.LangCode;
        setLanguageChangeLock(true);
        userService
            .changeLanguage(langCode)
            .then(res => {
                if (res.result?.ok && session.user)
                    session.languageChange(langCode);
                else
                    session.snackbarProvider(res.result?.message, { variant: "error" });
            })
            .finally(() => {
                setLanguageChangeLock(false);
            });
    }, []);

    return (
        <header>
            <Stack direction="row" justifyContent="space-between">
                <IconButton onClick={openMenuRequestHandler}>
                    <Menu />
                </IconButton>

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
                    padding={2}
                >
                    <Stack direction="row" flexWrap="wrap" justifyContent="space-between">
                        <Typography>{session.uiText.language}</Typography>
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
                                }}
                                onChange={handleLanguageChange}
                                value={session.user?.lang}
                                label={session.uiText.language}
                            >
                                {UIText.langCodes.map(langCode => <MenuItem value={langCode}>{langCode}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Stack>
                    <Box marginBlock={3} textAlign="center">
                        <IconButton
                            color="inherit"
                            onClick={() => session.themeManager.set(session.themeManager.name === 'light' ? 'dark' : 'light')}
                        >{session.themeManager.name === 'light' ? <LightMode /> : <DarkMode />}</IconButton>
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