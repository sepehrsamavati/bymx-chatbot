import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  base: "/ui/",
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3017",
        secure: false,
      },
    },
  },
  plugins: [reactRouter(), tsconfigPaths()],
  define: {
    '__APP_VERSION__': JSON.stringify(process.env.npm_package_version),
  },
});
