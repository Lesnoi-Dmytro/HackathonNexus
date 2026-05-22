/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src/__tests__"],
  testMatch: ["**/*.test.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.test.json" }],
  },
  collectCoverageFrom: [
    "src/services/**/*.ts",
    "src/middleware/**/*.ts",
    "src/clients/**/*.ts",
  ],
  coverageThreshold: {
    global: {
      lines: 70,
      functions: 70,
      branches: 70,
      statements: 70,
    },
  },
  coverageReporters: ["text", "lcov", "html"],
};
