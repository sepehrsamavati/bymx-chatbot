import { Outlet } from "react-router";
import Container from '@mui/material/Container';
import CssBaseline from '@mui/material/CssBaseline';
import { useState } from "react";

function Header(props: {
    menuIsOpen: boolean;
    openMenuRequest: () => void;
}) {
    return (
        <header>
            Header
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