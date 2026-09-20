import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 30000,
    hookTimeout: 30000,
    // test files share Mongoose's single default connection (testDb.js
    // uses mongoose.connect(), not a per-file connection) - running files
    // in parallel races that connection between files and causes flaky
    // cross-test data bleed, so keep file execution serialized
    fileParallelism: false,
    env: {
      JWT_SECRET_A: "test-jwt-secret",
      JWT_REFRESH_SECRET: "test-jwt-refresh-secret",
      CORS_ORIGINS: "http://localhost:3000",
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
