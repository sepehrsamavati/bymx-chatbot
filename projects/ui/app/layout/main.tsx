import Stack from "@mui/material/Stack";
import { useEffect, useRef, useState } from "react";
import { Link, Outlet } from "react-router";
import { Box, Drawer } from "@mui/material";
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
    const session = useSession();
    const [menuIsOpen, setMenuIsOpen] = useState(false);
    const openMenuRequestHandler = () => setMenuIsOpen(true);
    const closeMenuRequestHandler = () => setMenuIsOpen(false);

    return (
        <header>
            <Stack direction="row" justifyContent="space-between">
                <IconButton onClick={openMenuRequestHandler}>
                    <Menu />
                </IconButton>

                <Link to="/">
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
                // sx={{
                //     '.MuiPaper-root': {
                //         left: 'unset',
                //         right: 0,
                //     }
                // }}
                onClose={closeMenuRequestHandler}
            >
                <Box
                    width="75vw"
                    height="100%"
                    maxWidth="360px"
                >
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