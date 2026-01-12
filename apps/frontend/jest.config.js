const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@hyper-trigger/api-client/vanilla$': '<rootDir>/../../packages/api-client/dist/vanilla.js',
    '^@hyper-trigger/api-client$': '<rootDir>/../../packages/api-client/dist/index.js',
    '^@hyper-trigger/shared/tokens$': '<rootDir>/../../packages/shared/dist/tokens.js',
    '^@hyper-trigger/shared$': '<rootDir>/../../packages/shared/dist/index.js',
  },
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/'],
  transformIgnorePatterns: [
    '/node_modules/(?!(@hyper-trigger|@tanstack)/)',
  ],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)

