import {
    type RouteConfig,
    layout,
    index,
} from "@react-router/dev/routes";

export default [
    layout("./layout/main.tsx", [
        index("./routes/home.tsx"),
    ]),
] satisfies RouteConfig;
