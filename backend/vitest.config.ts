import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
    },
  },
  test: {
    root: resolve(import.meta.dirname),
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
