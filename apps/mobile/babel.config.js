module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // Bundles build-time flags from .env into the `@env` virtual module.
    // These are compile-time constants (inlined by babel), not runtime secrets.
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        path: '.env',
        safe: false,
        allowUndefined: true,
      },
    ],
  ],
};
