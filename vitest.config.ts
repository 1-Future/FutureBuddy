import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["server/src/**/*.test.ts", "shared/src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      exclude: [
        "node_modules/",
        "dist/",
        "app/",
        "web/",
        "**/*.test.ts",
        "server/src/index.ts",
        "server/src/routes/**",
        "server/src/modules/terminal/**",
      ],
    },
  },
  resolve: {
    alias: {
      "@futurebuddy/shared": resolve(__dirname, "shared/src/index.ts"),
    },
  },
});
