module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    // Resolve workspace packages to their TS source (Metro/Babel bundle TS
    // directly, no build step — see metro.config.js / tsconfig paths).
    '^@spider/(.*)$': '<rootDir>/../../packages/$1/src',
  },
  // The RN preset ignores node_modules by default; these ship untranspiled ESM
  // and must be transformed so component tests (e.g. App.test) can import them.
  transformIgnorePatterns: [
    'node_modules/(?!(?:@react-native|react-native|react-native-webview|@react-native-async-storage)/)',
  ],
};
