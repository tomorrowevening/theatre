/** @type {import('jest').Config} */
module.exports = {
  testMatch: [
    '<rootDir>/packages/*/src/**/*.test.ts',
    '<rootDir>/theatre/*/src/**/*.test.ts',
    '<rootDir>/theatre/*/src/**/*.test.ts',
    '<rootDir>/devEnv/**/*.test.ts',
  ],
  moduleNameMapper: {
    '\\.(css|svg|png)$': '<rootDir>/devEnv/jest/assetMock.js',
    ...require('./devEnv/getAliasesFromTsConfig').getAliasesFromTsConfigForJest(),
    'lodash-es/(.*)': 'lodash/$1',
    'react-use/esm/(.*)': 'react-use/lib/$1',
    'lodash-es': 'lodash',
    // ES modules that jest can't handle at the moment.
    uuid: '<rootDir>/node_modules/uuid/dist/index.js',
    nanoid: '<rootDir>/node_modules/nanoid/index.cjs',
    'nanoid/non-secure': '<rootDir>/node_modules/nanoid/non-secure/index.cjs',
    'react-icons/(.*)': '<rootDir>/devEnv/jest/reactIconsMock.js',
    'react-merge-refs': '<rootDir>/devEnv/jest/reactMergeRefsMock.js',
  },
  setupFiles: ['./theatre/shared/src/setupTestEnv.ts'],
  automock: false,
  transform: {
    '^.+\\.tsx?$': [
      'jest-esbuild',
      {
        sourcemap: true,
        supported: {
          'dynamic-import': false,
        },
      },
    ],
    '^.+\\.js$': [
      'jest-esbuild',
      {
        sourcemap: true,
        supported: {
          'dynamic-import': false,
        },
      },
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
}
