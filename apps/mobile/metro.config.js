const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * Monorepo setup: the app lives at apps/mobile/ and consumes the workspace
 * packages under <repo-root>/packages/* (linked into the hoisted root
 * node_modules by npm workspaces). watchFolders points at the repo root so
 * Metro follows those symlinks and bundles their TS source; nodeModulesPaths
 * lists both the (rare) local node_modules and the hoisted root one.
 *
 * @type {import('metro-config').MetroConfig}
 */
const repoRoot = path.resolve(__dirname, '../..');
const config = {
  watchFolders: [repoRoot],
  resolver: {
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(repoRoot, 'node_modules'),
    ],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
