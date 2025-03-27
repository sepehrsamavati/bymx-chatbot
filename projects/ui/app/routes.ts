import {
    type RouteConfig,
    layout,
    index,
    route,
} from "@react-router/dev/routes";

export default [
    layout("./layout/main.tsx", [
        route("/ui", "./routes/home.tsx"),
        route("/ui/chats", "./routes/chats.tsx"),
        route("/ui/chat/:chatId", "./routes/chat.tsx"),
        route("*", "./routes/notFound.tsx"),
    ]),
] satisfies RouteConfig;
