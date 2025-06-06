import {
    type RouteConfig,
    layout,
    index,
    route,
    prefix,
} from "@react-router/dev/routes";

export default [
    route("/ui/login", "./routes/login.tsx", { id: "login" }),
    route("/ui/tgAuth", "./components/telegramAuth.tsx"),
    layout("./layout/authGuard.tsx", [
        layout("./layout/main.tsx", [
            // index("./routes/home.tsx", { id: "root-home" }),
            index("./routes/chats.tsx", { id: "root-chats" }),
            ...prefix("ui", [
                // index("./routes/home.tsx", { id: "ui-home" }),
                index("./routes/chats.tsx", { id: "ui-index-chats" }),
                route("/chats", "./routes/chats.tsx"),
                route("/imageGenerate", "./routes/imageGenerate.tsx"),
                route("/chat", "./routes/chat.tsx", { id: "new-chat" }),
                route("/chat/:chatIdParam", "./routes/chat.tsx", { id: "chat" }),
                route("/settings", "./routes/settings.tsx"),

                ...prefix("admin", [
                    index("./routes/admin/index.tsx"),
                    route("/models", "./routes/admin/models.tsx"),
                    route("/shutdown", "./routes/admin/gracefulShutdown.tsx"),
                ]),

                route("*", "./routes/notFound.tsx"),
            ]),
        ]),
    ]),
    route("*", "./routes/login.tsx", { id: "not-found-unauthorized-login" }),
] satisfies RouteConfig;
