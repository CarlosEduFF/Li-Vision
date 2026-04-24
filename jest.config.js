module.exports = {
  preset: 'react-native',
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@react-navigation/.*|react-native-reanimated|react-native-worklets-core|@react-native-async-storage/async-storage)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },
  testMatch: [
    '<rootDir>/app/**/__tests__/**/*.[jt]s?(x)',
    '<rootDir>/services/**/__tests__/**/*.[jt]s?(x)',
    '<rootDir>/components/**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'services/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    '!app/**/_layout.tsx',
    '!app/**/+(index|layout|loading).{ts,tsx}',
    '!**/node_modules/**',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest-setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};
