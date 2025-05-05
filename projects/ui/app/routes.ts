import {
    type RouteConfig,
    layout,
    index,
    route,
    prefix,
} from "@react-router/dev/routes";

// import {} from "@v7/"

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
                route("/chat/:chatId", "./routes/chat.tsx"),
                route("*", "./routes/notFound.tsx"),
            ]),
        ]),
    ]),
    route("*", "./routes/login.tsx", { id: "not-found-unauthorized-login" }),
] satisfies RouteConfig;
