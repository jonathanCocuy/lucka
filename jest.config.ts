import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  clearMocks: true,
  coverageProvider: 'v8',
  // Solo se prueba lógica pura: no hace falta DOM.
  testEnvironment: 'node',
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  // Ahí viven los builds de Rust y C++ (cmake deja archivos .ts que no son TypeScript).
  modulePathIgnorePatterns: ['<rootDir>/src-tauri/'],
}

export default createJestConfig(config)
