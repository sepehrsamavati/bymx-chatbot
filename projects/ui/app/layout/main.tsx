import { Outlet } from "react-router";
import Container from '@mui/material/Container';
import CssBaseline from '@mui/material/CssBaseline';

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
                {/* <Header menuIsOpen={menuIsOpen} openMenuRequest={openMenuRequestHandler} /> */}
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