import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  clearMocks: true,
  coverageProvider: 'v8',
  // Only pure logic is tested: no DOM needed.
  testEnvironment: 'node',
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  // Rust and C++ builds live there (cmake leaves .ts files that aren't TypeScript).
  modulePathIgnorePatterns: ['<rootDir>/src-tauri/'],
}

export default createJestConfig(config)
