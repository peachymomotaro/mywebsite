import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { transformWithEsbuild } from "vite";
import path from "node:path";

function jsxInJsFiles() {
  return {
    name: "jsx-in-js-files",
    enforce: "pre",
    async transform(code: string, id: string) {
      const [filepath] = id.split("?");

      if (!filepath.endsWith(".js") || filepath.includes("/node_modules/")) {
        return null;
      }

      return transformWithEsbuild(code, filepath, {
        loader: "jsx",
        jsx: "automatic",
      });
    },
  };
}

export default defineConfig({
  plugins: [jsxInJsFiles(), react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["tests/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
