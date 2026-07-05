/**
 * Jest global setup.
 */

// AsyncStorage has no native backend under Jest — use the library's mock so the
// zustand `persist` middleware in settingsStore can hydrate without throwing.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// react-native-webview binds a native TurboModule (RNCWebViewModule) that isn't
// present under Jest. Replace it with a plain View so components that render it
// (BrowserScreen/App) can be tested without the native binary.
jest.mock('react-native-webview', () => {
  const React = require('react');
  const {View} = require('react-native');
  const WebView = React.forwardRef((props, ref) =>
    React.createElement(View, {...props, ref}),
  );
  return {__esModule: true, default: WebView, WebView};
});

// react-native-view-shot binds a native module (RNViewShot). Stub captureRef so
// BrowserScreen renders/tests without the native binary.
jest.mock('react-native-view-shot', () => ({
  __esModule: true,
  captureRef: jest.fn(() => Promise.resolve('data:image/jpeg;base64,')),
}));

// react-native-safe-area-context relies on a native module for insets; provide
// lightweight component/hook mocks so the app tree renders under Jest.
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const inset = {top: 0, right: 0, bottom: 0, left: 0};
  const frame = {width: 0, height: 0, x: 0, y: 0};
  const passthrough = ({children}) => React.createElement(React.Fragment, null, children);
  return {
    SafeAreaProvider: passthrough,
    SafeAreaView: passthrough,
    SafeAreaConsumer: ({children}) => children(inset),
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => frame,
  };
});

// crypto.getRandomValues is provided on-device by react-native-get-random-values
// (imported in index.js). Under Node/Jest, wire it to node's webcrypto so the
// tab-id UUID generator works.
const {webcrypto} = require('crypto');
if (!global.crypto) {
  global.crypto = webcrypto;
}
