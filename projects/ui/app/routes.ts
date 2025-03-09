import {
    type RouteConfig,
    layout,
    index,
    route,
} from "@react-router/dev/routes";

export default [
    layout("./layout/main.tsx", [
        index("./routes/home.tsx"),

        route("/ui/chat/:chatId", "./routes/chat.tsx"),
    ]),
] satisfies RouteConfig;
