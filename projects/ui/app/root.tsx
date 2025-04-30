import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import "./app.css";
import { useMemo, useState } from "react";
import type { Route } from "./+types/root";
import { SnackbarProvider } from "notistack";
import { ThemeProvider } from "@mui/material";
import { CacheProvider } from "@emotion/react";
import HttpClient from "./core/helper/HttpClient";
import Session, { SessionContext } from "./core/Session";
import { cacheRtl, muiThemeOptions, type ThemeName } from "./core/config/mui";
import { SnackbarProviderConfigurator } from "./core/helper/snackbarProvider";

// export const links: Route.LinksFunction = () => [
//   { rel: "preconnect", href: "https://fonts.googleapis.com" },
//   {
//     rel: "preconnect",
//     href: "https://fonts.gstatic.com",
//     crossOrigin: "anonymous",
//   },
//   {
//     rel: "stylesheet",
//     href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
//   },
// ];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <title>Baymax AI</title>
        <script src="https://telegram.org/js/telegram-web-app.js"></script>
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const [, setTheme] = useState<ThemeName>('light');
  const [, setDummyState] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const session = useMemo<Session>(() => {
    const sessionInstance = new Session(setTheme, () => setDummyState(current => current + 1));

    HttpClient.session = sessionInstance;

    return sessionInstance;
  }, []);

  return (
    <>
      <SnackbarProvider maxSnack={3}>
        <SnackbarProviderConfigurator />
      </SnackbarProvider>
      <CacheProvider value={cacheRtl}>
        <ThemeProvider theme={muiThemeOptions(session.themeManager)}>
          <SessionContext.Provider value={session}>
            <Outlet />
          </SessionContext.Provider>
        </ThemeProvider>
      </CacheProvider>
    </>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
