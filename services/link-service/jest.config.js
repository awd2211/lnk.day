module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', {
      tsconfig: {
        types: ['jest', 'node'],
        strict: false,
        strictNullChecks: false,
      },
    }],
  },
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@lnk/nestjs-common$': '<rootDir>/../../packages/nestjs-common/src',
    '^@lnk/shared-types$': '<rootDir>/../../packages/shared-types/src',
  },
  roots: ['<rootDir>/src/', '<rootDir>/test/'],
};
