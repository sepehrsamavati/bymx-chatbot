import {
    type RouteConfig,
    layout,
    index,
    route,
    prefix,
} from "@react-router/dev/routes";

// import {} from "@v7/"

export default [
    index("./routes/home.tsx", { id: "root-home" }),
    route("/ui/login", "./routes/login.tsx"),
    route("/ui/tgAuth", "./components/telegramAuth.tsx"),
    layout("./layout/authGuard.tsx", [
        layout("./layout/main.tsx", [
            ...prefix("ui", [
                index("./routes/home.tsx", { id: "ui-home" }),
                route("/chats", "./routes/chats.tsx"),
                route("/chat/:chatId", "./routes/chat.tsx"),
            ]),
            route("*", "./routes/notFound.tsx"),
        ]),
    ]),
] satisfies RouteConfig;
