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
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/**/*.module.ts',
    '!src/**/*.entity.ts',
    '!src/**/*.dto.ts',
    '!src/main.ts',
    '!src/**/index.ts',
  ],
  coverageDirectory: './coverage',
  coverageThreshold: {
    // Core modules - 80% threshold
    'src/modules/auth/auth.service.ts': {
      branches: 70,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    'src/modules/auth/auth.controller.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    'src/modules/user/user.service.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    'src/modules/user/user.controller.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    'src/modules/team/team.service.ts': {
      branches: 60,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    'src/modules/team/team.controller.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    'src/modules/apikey/apikey.service.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    'src/modules/apikey/apikey.controller.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    'src/modules/team/invitation.service.ts': {
      branches: 70,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@lnk/nestjs-common$': '<rootDir>/../../packages/nestjs-common/src',
    '^@lnk/shared-types$': '<rootDir>/../../packages/shared-types/src',
  },
  roots: ['<rootDir>/src/', '<rootDir>/test/'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
};
