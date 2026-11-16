import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig(({ mode }) => ({
  resolve: {
    alias:
      mode === "online"
        ? [
            {
              find: "../domain/demo-scenarios",
              replacement: fileURLToPath(
                new URL("./src/online/demo-scenarios.ts", import.meta.url),
              ),
            },
          ]
        : [],
  },
  plugins: [
    react(),
    tailwindcss(),
    ...(mode === "online"
      ? [
          {
            name: "online-entry",
            transformIndexHtml: {
              order: "pre" as const,
              handler: (html: string) =>
                html.replace("/src/main.tsx", "/src/online-main.tsx"),
            },
          },
        ]
      : []),
  ],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    fs: {
      deny: [
        ".env",
        ".env.*",
        "**/*.xlsx",
        "**/*.xls",
        "**/.git/**",
        "**/.local/**",
        "**/.agents/**",
        "**/.codex/**",
        ...(mode !== "test"
          ? ["**/server/**", "**/docs/**", "**/tests/**", "**/proposal.md"]
          : []),
        ...(mode === "online"
          ? [
              "**/src/data/**",
              "**/src/store/store.ts",
              "**/src/domain/demo-scenarios.ts",
            ]
          : []),
      ],
    },
    proxy: { "/api": { target: "http://127.0.0.1:8080" } },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "server/**/*.test.ts"],
    restoreMocks: true,
  },
}));
