import { defineConfig } from "vitest/config";

export default defineConfig({
  oxc: { jsx: { runtime: "automatic" } },
  // Full-lesson interaction tests can exceed 5s on Windows/OneDrive machines.
  test: { include: ["src/**/*.test.{ts,tsx}"], maxWorkers: 2, testTimeout: 15000 },
});
