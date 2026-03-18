import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    exclude: ["./old/**", "./.direnv/**", "./.devenv/**"],
  },
  esbuild: {
    target: "esnext",
  },
})
