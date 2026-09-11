import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 30000,
    hookTimeout: 30000,
    env: {
      JWT_SECRET_A: "test-jwt-secret",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: [
        "auth/**",
        "controllers/**",
        "middleware/**",
        "models/**",
        "routes/**",
        "app.js",
      ],
    },
  },
});
