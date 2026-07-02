module.exports = {
  root: true,
  extends: '@react-native',
  ignorePatterns: [
    'node_modules/',
    'android/',
    'ios/',
    'coverage/',
    'vendor/',
  ],
  overrides: [
    {
      // Jest config/setup and test files run in the Jest + Node environment.
      files: ['jest.setup.js', 'jest.config.js', '**/__tests__/**', '*.test.*'],
      env: {'jest/globals': true, node: true},
    },
  ],
};
