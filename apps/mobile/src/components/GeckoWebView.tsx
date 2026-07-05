import React, { useRef, useImperativeHandle, forwardRef, useCallback, useEffect } from 'react';
import {
  requireNativeComponent,
  UIManager,
  findNodeHandle,
  NativeSyntheticEvent,
  HostComponent,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import type { WebViewNavigation } from 'react-native-webview';
import type { HardenedWebViewHandle, HardenedWebViewProps } from './HardenedWebView';

// Native events emitted by GeckoViewManager (Android). Names match the manager's
// getExportedCustomDirectEventTypeConstants registrationNames.
interface LocationEvent { url: string }
interface LoadingEvent { loading: boolean; canGoBack: boolean; canGoForward: boolean; progress: number }
interface ErrorEvent { url?: string; code: number; category: number }
interface TitleEvent { title: string }

interface NativeGeckoProps {
  url: string;
  style?: StyleProp<ViewStyle>;
  onLocationChange?: (e: NativeSyntheticEvent<LocationEvent>) => void;
  onLoadingChange?: (e: NativeSyntheticEvent<LoadingEvent>) => void;
  onLoadError?: (e: NativeSyntheticEvent<ErrorEvent>) => void;
  onTitleChange?: (e: NativeSyntheticEvent<TitleEvent>) => void;
}

// RNTGeckoView is a legacy SimpleViewManager rendered under Fabric via the
// automatic interop layer (New Architecture). requireNativeComponent resolves it.
const RNTGeckoView: HostComponent<NativeGeckoProps> =
  requireNativeComponent<NativeGeckoProps>('RNTGeckoView');

/**
 * GeckoView-backed engine (Android, Phase 4) with the SAME imperative handle and
 * a compatible prop subset as {@link HardenedWebView}, so it can be swapped in
 * behind the GECKOVIEW_ENABLED flag (see BrowserEngine).
 *
 * Tracking protection is enforced at the engine level (STRICT ETP in
 * GeckoRuntimeProvider), so there is no in-page request blocker here. JS bundle
 * injection and the per-tab tracker counter (onMessage/onBlocked) are wired in a
 * follow-up increment via a bundled WebExtension; those props are accepted now
 * but not yet emitted.
 */
export const GeckoWebView = forwardRef<HardenedWebViewHandle, HardenedWebViewProps>(
  ({ url, onNavigationStateChange, onLoadError, onLoadStart, style }, ref) => {
    const nativeRef = useRef<React.ComponentRef<typeof RNTGeckoView>>(null);
    // Coalesced navigation snapshot rebuilt from the native events, shaped like
    // react-native-webview's WebViewNavigation for the shared consumer.
    const nav = useRef<Partial<WebViewNavigation>>({ url, canGoBack: false, canGoForward: false });

    const dispatch = useCallback((command: string, args: unknown[] = []) => {
      const node = findNodeHandle(nativeRef.current);
      if (node != null) {
        UIManager.dispatchViewManagerCommand(node, command, args);
      }
    }, []);

    // Drive navigation imperatively: the `url` prop is unreliable under the New
    // Arch interop layer, so load via a command whenever the URL changes.
    useEffect(() => {
      if (url) {
        dispatch('loadUrl', [url]);
      }
    }, [url, dispatch]);

    useImperativeHandle(ref, () => ({
      goBack: () => dispatch('goBack'),
      goForward: () => dispatch('goForward'),
      reload: () => dispatch('reload'),
    }));

    const pushNav = () => onNavigationStateChange?.(nav.current as WebViewNavigation);

    return (
      <RNTGeckoView
        ref={nativeRef}
        url={url}
        // RNTGeckoView is a raw native view with no intrinsic size; unlike
        // react-native-webview (which wraps its native view in a flex:1 container),
        // it collapses to 0-height unless we stretch it to fill the parent.
        style={[styles.fill, style]}
        onLocationChange={(e) => {
          // A freshly-opened GeckoSession emits an about:blank location before our
          // imperative loadUri lands. Propagating it would reset the tab URL to
          // about:blank, unmount this engine and bounce the user back to Home, so
          // we drop blank/empty locations and keep the real navigation only.
          const next = e.nativeEvent.url;
          if (!next || next === 'about:blank') { return; }
          nav.current.url = next;
          pushNav();
        }}
        onLoadingChange={(e) => {
          const { loading, canGoBack, canGoForward } = e.nativeEvent;
          nav.current.canGoBack = canGoBack;
          nav.current.canGoForward = canGoForward;
          nav.current.loading = loading;
          if (loading) { onLoadStart?.(); }
          pushNav();
        }}
        onTitleChange={(e) => {
          nav.current.title = e.nativeEvent.title;
          pushNav();
        }}
        onLoadError={(e) => {
          onLoadError?.({
            kind: 'native',
            code: e.nativeEvent.code,
            url: e.nativeEvent.url,
            description: `gecko error (category ${e.nativeEvent.category})`,
          });
        }}
      />
    );
  }
);

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
