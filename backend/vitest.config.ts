import { defineConfig } from "vitest/config";

// Backend-scoped config so the storefront's root vitest.config.ts (whose
// include paths are relative to the repo root) never bleeds into backend runs.
export default defineConfig({
  test: {
    include: ["src/**/__tests__/**/*.test.ts"],
  },
});
