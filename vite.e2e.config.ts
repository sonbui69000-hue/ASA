import { defineConfig } from "vite";
export default defineConfig({
  build: {
    ssr: "tests/e2e/online-server.ts",
    outDir: "dist-test-server",
    emptyOutDir: true,
    target: "node26",
    rollupOptions: { output: { entryFileNames: "index.js" } },
  },
});
