import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname) },
  },
  test: {
    include: [
      "lib/__tests__/**/*.test.ts",
      "components/__tests__/**/*.test.ts",
      // Pure view-model logic for the ReefNerds app (no RN imports).
      "mobile/lib/__tests__/**/*.test.ts",
    ],
  },
});
