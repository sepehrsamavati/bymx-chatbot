import { useState } from "react";
import { Outlet } from "react-router";
import Stack from "@mui/material/Stack";
import { Box, Drawer, Typography } from "@mui/material";
import Menu from "@mui/icons-material/Menu";
import { useSession } from "~/core/Session";
import Container from '@mui/material/Container';
import bymxLogo from "../assets/images/bymx.jpg";
import IconButton from "@mui/material/IconButton";
import CssBaseline from '@mui/material/CssBaseline';
import DarkMode from "@mui/icons-material/DarkMode";
import LightMode from "@mui/icons-material/LightMode";
import bymxHeader from "../assets/images/baymax_header.png";

function Header() {
    const themeManager = useSession().themeManager;
    const [menuIsOpen, setMenuIsOpen] = useState(false);
    const openMenuRequestHandler = () => setMenuIsOpen(true);
    const closeMenuRequestHandler = () => setMenuIsOpen(false);

    return (
        <header>
            <Stack direction="row" justifyContent="space-between">
                <IconButton onClick={openMenuRequestHandler}>
                    <Menu />
                </IconButton>

                <Box
                    component="img"
                    src={bymxHeader}
                    sx={{
                        height: 50,
                        padding: 0.2,
                        maxWidth: "50%",
                    }}
                />

                <Box
                    component="img"
                    src={bymxLogo}
                    sx={{
                        height: 50,
                        padding: 0.5,
                        borderRadius: "50%",
                        maxWidth: "50%",
                    }}
                />
            </Stack>

            <Drawer
                anchor="left"
                open={menuIsOpen}
                variant="temporary"
                sx={{
                    '.MuiPaper-root': {
                        left: 'unset',
                        right: 0,
                    }
                }}
                onClose={closeMenuRequestHandler}
            >
                <Box
                    width="75vw"
                    height="100%"
                    maxWidth="360px"
                >
                    <Box textAlign="center">
                        <IconButton
                            color="inherit"
                            onClick={() => themeManager.set(themeManager.name === 'light' ? 'dark' : 'light')}
                        >{themeManager.name === 'light' ? <LightMode /> : <DarkMode />}</IconButton>
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
                        overflowY: "auto"
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