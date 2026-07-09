import { Suspense, useMemo, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { Box, ThemeProvider } from '@mui/material';
import { CacheProvider } from '@emotion/react';
import { SnackbarProvider } from 'notistack';
import { stringHelper } from 'bymx-core/shared';
import './assets/css/global.css';
import './app.css';
import HttpClient from '~/core/helper/HttpClient';
import Session, { SessionContext } from '~/core/Session';
import { cacheRtl, muiThemeOptions, type ThemeName } from '~/core/config/mui';
import { SnackbarProviderConfigurator } from '~/core/helper/snackbarProvider';
import Button from '~/components/Button';
import { PageFallback } from '~/components/PageFallback';
import { AuthGuard } from '~/layout/AuthGuard';
import { MainLayout } from '~/layout/MainLayout';
import {
  AdminIndexPage,
  AdminModelsPage,
  ChatPage,
  ChatsPage,
  GracefulShutdownPage,
  ImageGeneratePage,
  LoginPage,
  NotFoundPage,
  SettingsPage,
  TelegramAuthPage,
} from '~/routes/pages';

function withSuspense(element: React.ReactNode) {
  return <Suspense fallback={<PageFallback />}>{element}</Suspense>;
}

export function App() {
  const [themeName, setTheme] = useState<ThemeName>('light');
  const [, setDummyState] = useState(0);

  const session = useMemo<Session>(() => {
    const sessionInstance = new Session(setTheme, () => setDummyState((current) => current + 1));
    HttpClient.session = sessionInstance;
    return sessionInstance;
  }, []);

  const { cacheProviderValue, themeProviderValue } = useMemo(() => {
    let direction: 'ltr' | 'rtl' = 'rtl';

    if (session.uiText?._langCode) {
      direction = stringHelper.langCodeToDirection(session.uiText._langCode);
      window.document.documentElement.lang = session.uiText._langCode;
      window.document.documentElement.dir = direction;
    }

    return {
      cacheProviderValue: cacheRtl(direction),
      themeProviderValue: muiThemeOptions(session.themeManager, direction),
    };
  }, [themeName, session.themeManager, session.uiText._langCode]);

  return (
    <SnackbarProvider
      maxSnack={3}
      action={(snackbarId) => (
        <Box marginInlineStart="20px">
          <Button
            size="small"
            type="button"
            variant="outlined"
            color="inherit"
            sx={{ fontFamily: 'inherit' }}
            onClick={() => session.closeSnackbar(snackbarId)}
          >
            {session.uiText.close}
          </Button>
        </Box>
      )}
    >
      <SnackbarProviderConfigurator />
      <CacheProvider value={cacheProviderValue}>
        <ThemeProvider theme={themeProviderValue}>
          <SessionContext.Provider key={session.uiText._langCode} value={session}>
            <BrowserRouter>
              <Routes>
                <Route path="/ui/login" element={withSuspense(<LoginPage />)} />
                <Route path="/ui/tgAuth" element={withSuspense(<TelegramAuthPage />)} />
                <Route element={<AuthGuard />}>
                  <Route element={<MainLayout />}>
                    <Route path="/ui" element={withSuspense(<ChatsPage />)} />
                    <Route path="/ui/chats" element={withSuspense(<ChatsPage />)} />
                    <Route path="/ui/imageGenerate" element={withSuspense(<ImageGeneratePage />)} />
                    <Route path="/ui/chat" element={withSuspense(<ChatPage />)} />
                    <Route path="/ui/chat/:chatIdParam" element={withSuspense(<ChatPage />)} />
                    <Route path="/ui/settings" element={withSuspense(<SettingsPage />)} />
                    <Route path="/ui/admin" element={withSuspense(<AdminIndexPage />)} />
                    <Route path="/ui/admin/models" element={withSuspense(<AdminModelsPage />)} />
                    <Route path="/ui/admin/shutdown" element={withSuspense(<GracefulShutdownPage />)} />
                    <Route path="/ui/*" element={withSuspense(<NotFoundPage />)} />
                  </Route>
                </Route>
                <Route path="*" element={<Navigate to="/ui/login" replace />} />
              </Routes>
            </BrowserRouter>
          </SessionContext.Provider>
        </ThemeProvider>
      </CacheProvider>
    </SnackbarProvider>
  );
}
