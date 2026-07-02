/**
 * @format
 * Smoke test: the full app tree mounts without throwing. Native modules
 * (WebView, SafeAreaContext, AsyncStorage) are mocked in jest.setup.js.
 */
import 'react-native';
import React from 'react';
import {describe, it} from '@jest/globals';
import {act, create} from 'react-test-renderer';
import App from '../App';

describe('App', () => {
  it('renders without crashing', async () => {
    let tree: ReturnType<typeof create> | undefined;
    await act(async () => {
      tree = create(<App />);
    });
    // Flush the async persist rehydration before teardown.
    await act(async () => {
      await Promise.resolve();
    });
    tree?.unmount();
  });
});
