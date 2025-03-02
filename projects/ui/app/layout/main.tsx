import { useState } from "react";
import { Outlet } from "react-router";
import Stack from "@mui/material/Stack";
import Menu from "@mui/icons-material/Menu";
import Container from '@mui/material/Container';
import IconButton from "@mui/material/IconButton";
import CssBaseline from '@mui/material/CssBaseline';

function Header(props: {
    menuIsOpen: boolean;
    openMenuRequest: () => void;
}) {
    return (
        <header>
            <Stack direction="row">
                <IconButton>
                    <Menu />
                </IconButton>
            </Stack>
        </header>
    );
}

export default function MainLayout() {
    const [menuIsOpen, setMenuIsOpen] = useState(false);
    const openMenuRequestHandler = () => setMenuIsOpen(true);

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
                <Header menuIsOpen={menuIsOpen} openMenuRequest={openMenuRequestHandler} />
                <main>
                    {/* <SideMenu isOpen={menuIsOpen} closeCallback={closeMenuRequestHandler} /> */}
                    {/* <SideMenuBackdrop visible={menuIsOpen} closeMenu={closeMenuRequestHandler} /> */}
                    <Outlet />
                </main>
                {/* <Footer /> */}
            </Container>
        </>
    );
}