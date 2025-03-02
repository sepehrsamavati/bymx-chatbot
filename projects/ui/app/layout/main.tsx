import { useState } from "react";
import { Box, Drawer } from "@mui/material";
import { Outlet } from "react-router";
import Stack from "@mui/material/Stack";
import Menu from "@mui/icons-material/Menu";
import Container from '@mui/material/Container';
import bymxLogo from "../assets/images/bymx.jpg";
import IconButton from "@mui/material/IconButton";
import CssBaseline from '@mui/material/CssBaseline';
import bymxHeader from "../assets/images/baymax_header.png";

function Header() {
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
                anchor="right"
                open={menuIsOpen}
                onClose={closeMenuRequestHandler}
            >
                <Box
                    width="75vw"
                    height="100%"
                    maxWidth="360px"
                ></Box>
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